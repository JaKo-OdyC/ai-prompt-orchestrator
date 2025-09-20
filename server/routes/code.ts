import type { Express, Request, Response } from "express";
import { redactSensitive } from "../lib/redact";
import { chunkCode } from "../lib/chunk";
import { timed, estTokens, priceCalc, buildMetrics } from "../lib/measure";

// Provider adapter for code analysis
async function providerCallChunk(provider: string, mode: string, text: string) {
  // TODO: Connect to real AI provider for code analysis
  // Simulate analysis response
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
  
  const analysisText = `## ${mode.toUpperCase()} Analysis (${provider})

**Code Quality:** Good structure with clear function definitions.

**Issues Found:**
- Consider adding type annotations for better TypeScript support
- Some variable names could be more descriptive
- Missing error handling in async functions

**Recommendations:**
- Add JSDoc comments for public functions
- Consider breaking down complex functions
- Implement proper error boundaries

**Security Notes:**
- No obvious security vulnerabilities detected
- Follow best practices for input validation

---
*Analysis provided by ${provider} AI*`;

  return { 
    text: analysisText, 
    model: "default" 
  };
}

export function mountCodeRoutes(app: Express) {
  // Chunked code analysis endpoint
  app.post("/api/code/analyze", async (req: Request, res: Response) => {
    try {
      const { providers = ["deepseek"], mode = "review", code = "" } = req.body || {};
      
      if (!code || !providers?.length) {
        return res.status(400).send("Missing code or providers");
      }

      // Enhanced redaction that preserves code blocks
      const safe = redactSensitive(code);
      const chunks = chunkCode(safe, 2000);

      if (chunks.length === 0) {
        return res.status(400).send("No code chunks to analyze");
      }

      // Process each provider in parallel
      const perProvider = await Promise.all(providers.map(async (provider: string) => {
        try {
          // Analyze each chunk for this provider
          const results = await Promise.all(chunks.map(async (ch) => {
            const { res: out, latency_ms } = await timed(() =>
              providerCallChunk(provider, mode, ch.text)
            );
            
            const tokens_in = estTokens(ch.text);
            const tokens_out = estTokens(out.text || "");
            const cost_eur = priceCalc(provider, tokens_in, tokens_out);
            
            return {
              id: ch.id,
              text: out.text,
              metrics: buildMetrics({
                provider,
                model: out.model,
                latency_ms,
                tokens_in,
                tokens_out,
                cost_eur,
                text: out.text || ""
              })
            };
          }));

          return { provider, chunks: results };
        } catch (error) {
          console.error(`Provider ${provider} failed in code analysis:`, error);
          return { provider, chunks: [], error: "Provider failed" };
        }
      }));

      // Prepare chunk metadata (without full text to reduce response size)
      const chunkMetadata = chunks.map(c => ({
        id: c.id,
        start: c.start,
        end: c.end,
        lines: c.text.split('\n').length
      }));

      res.json({
        chunks: chunkMetadata,
        results: perProvider,
        totalChunks: chunks.length,
        mode
      });
    } catch (e: any) {
      console.error("Code analysis error:", e);
      res.status(500).send("Internal error");
    }
  });

  // Get specific chunk content
  app.post("/api/code/chunk/:chunkId", async (req: Request, res: Response) => {
    try {
      const { code = "" } = req.body || {};
      const chunkId = req.params.chunkId;
      
      if (!code) {
        return res.status(400).send("Missing code");
      }

      const safe = redactSensitive(code);
      const chunks = chunkCode(safe, 2000);
      const chunk = chunks.find(c => c.id === chunkId);
      
      if (!chunk) {
        return res.status(404).send("Chunk not found");
      }

      res.json({
        id: chunk.id,
        text: chunk.text,
        start: chunk.start,
        end: chunk.end,
        lines: chunk.text.split('\n').length
      });
    } catch (e: any) {
      console.error("Chunk retrieval error:", e);
      res.status(500).send("Internal error");
    }
  });
}