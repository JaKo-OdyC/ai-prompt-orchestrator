import type { Express, Request, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { redactSensitive } from "../lib/redact";
import { timed, estTokens, priceCalc, buildMetrics, ProviderMetrics } from "../lib/measure";
import { explainDecision } from "../lib/explain";
import { JobStore, addJob } from "../state/jobs";
import { makeKey, getCache, setCache } from "../lib/cache";

// Multer Limits
const upload = multer({ limits: { files: 20, fileSize: 10 * 1024 * 1024 } });

function parseArrayField(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String);
  try {
    const j = JSON.parse(input);
    return Array.isArray(j) ? j.map(String) : [String(input)];
  } catch {
    return [String(input)];
  }
}

function genId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function hashPrompt(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
}

// Adapter: TODO - Connect to existing AI provider services
async function providerCall(params: {
  provider: string;
  mode?: string;
  prompt: string;
  files?: Express.Multer.File[];
}): Promise<{ text: string; model?: string }> {
  // TODO: Replace with real provider implementation
  // For now, simulate response
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
  
  return {
    text: `[${params.provider}:${params.mode}] AI-generated response for: ${params.prompt.slice(0, 100)}...`,
    model: "default",
  };
}

export function mountPromptRoutes(app: Express) {
  // PREVIEW: single provider + single mode (enhanced with metrics)
  app.post("/api/prompts/preview", upload.array("files", 20), async (req: Request, res: Response) => {
    try {
      const provider = String(req.body.provider || "");
      const mode = String(req.body.mode || "");
      const promptRaw = String(req.body.prompt || "");
      
      if (!provider) return res.status(400).send("Missing provider");
      if (!mode) return res.status(400).send("Missing mode");
      if (!promptRaw) return res.status(400).send("Missing prompt");

      const safePrompt = redactSensitive(promptRaw);
      const { res: out, latency_ms } = await timed(() =>
        providerCall({ provider, mode, prompt: safePrompt, files: req.files as Express.Multer.File[] })
      );

      const tokens_in = estTokens(safePrompt);
      const tokens_out = estTokens(out.text || "");
      const cost_eur = priceCalc(provider, tokens_in, tokens_out);
      const metrics = buildMetrics({
        provider,
        model: out.model,
        latency_ms,
        tokens_in,
        tokens_out,
        cost_eur,
        text: out.text || "",
      });

      const previewId = genId("prev");
      res.json({ previewId, text: out.text, data: { metrics } });
    } catch (err: any) {
      if (err instanceof multer.MulterError) return res.status(400).send(`Upload error: ${err.message}`);
      console.error(err);
      res.status(500).send("Internal error");
    }
  });

  // GENERATE: multi provider + multi mode with parallel processing and caching
  app.post("/api/prompts/generate", upload.array("files", 20), async (req: Request, res: Response) => {
    try {
      const providers = parseArrayField(req.body.providers);
      const modes = parseArrayField(req.body.modes);
      const title = req.body.title ? String(req.body.title) : undefined;
      const promptRaw = String(req.body.prompt || "");
      const processing_mode = req.body.processing_mode ? String(req.body.processing_mode) : undefined;

      if (!promptRaw) return res.status(400).send("Missing prompt");
      if (!providers.length) return res.status(400).send("Missing providers");
      if (!modes.length) return res.status(400).send("Missing modes");

      const files = req.files as Express.Multer.File[] | undefined;
      const safePrompt = redactSensitive(promptRaw);
      const promptHash = hashPrompt(safePrompt);

      // Cache key generation
      const fileSigs = (files ?? []).map(f => ({ name: f.originalname, size: f.size }));
      const cacheKey = makeKey({ safePrompt, providers, modes, fileSigs });

      // Check cache first
      const cached = getCache(cacheKey);
      if (cached) {
        console.log("Cache hit for prompt generation");
        return res.json(cached);
      }

      // Parallel provider processing
      const tasks = providers.map(async (provider) => {
        const mode = modes[0] || "implement"; // Use first mode or default
        try {
          const { res: out, latency_ms } = await timed(() =>
            providerCall({ provider, mode, prompt: safePrompt, files })
          );
          const tokens_in = estTokens(safePrompt);
          const tokens_out = estTokens(out.text || "");
          const cost_eur = priceCalc(provider, tokens_in, tokens_out);
          
          return {
            provider,
            out,
            metrics: buildMetrics({
              provider,
              model: out.model,
              latency_ms,
              tokens_in,
              tokens_out,
              cost_eur,
              text: out.text || "",
            }),
          };
        } catch (error) {
          console.error(`Provider ${provider} failed:`, error);
          return null; // Will be filtered out
        }
      });

      const settled = await Promise.allSettled(tasks);

      const resultsByProvider: Record<string, { text: string; model?: string }> = {};
      const metrics: ProviderMetrics[] = [];

      for (const r of settled) {
        if (r.status === "fulfilled" && r.value) {
          const { provider, out, metrics: m } = r.value;
          resultsByProvider[provider] = { text: out.text || "", model: out.model };
          metrics.push(m);
        }
        // Silently skip failed providers for now
      }

      if (metrics.length === 0) {
        return res.status(500).send("All providers failed");
      }

      const decision = explainDecision(metrics);
      const jobId = genId("job");

      const metricsByProvider = Object.fromEntries(
        metrics.map((m) => [m.provider, m])
      );

      // Store job in history
      addJob({
        jobId,
        promptHash,
        providers,
        modes,
        decision: {
          winner: decision.winner,
          rationale: decision.rationale,
          ranking: decision.ranking,
        },
        metricsByProvider,
        title,
      });

      const payload = {
        jobId,
        decision,
        resultsByProvider,
        metricsByProvider,
        processing_mode,
      };

      // Cache the response for 2 minutes
      setCache(cacheKey, payload, 120_000);

      res.json(payload);
    } catch (err: any) {
      if (err instanceof multer.MulterError) return res.status(400).send(`Upload error: ${err.message}`);
      console.error(err);
      res.status(500).send("Internal error");
    }
  });

  // Job history endpoint
  app.get("/api/jobs", (_req: Request, res: Response) => {
    res.json({ items: JobStore.items });
  });

  // Single job details
  app.get("/api/jobs/:jobId", (req: Request, res: Response) => {
    const jobId = req.params.jobId;
    const job = JobStore.items.find(j => j.jobId === jobId);
    if (!job) return res.status(404).send("Job not found");
    res.json(job);
  });
}