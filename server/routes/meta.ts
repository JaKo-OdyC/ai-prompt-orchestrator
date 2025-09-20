import type { Express, Request, Response } from "express";
import { CONFIG } from "../config";

export function mountMetaRoutes(app: Express) {
  // Enhanced health check with more details
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      uptime_s: Math.round(process.uptime()),
      version: process.env.APP_VERSION || "dev",
      time: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      features: {
        caching: true,
        parallel_processing: true,
        chunked_analysis: true,
        job_persistence: !!process.env.JOBS_JSONL,
      }
    });
  });

  // Dynamic providers from config
  app.get("/api/providers", (_req: Request, res: Response) => {
    res.json({
      providers: CONFIG.PROVIDERS,
      pricing: Object.keys(CONFIG.PRICE).map(provider => ({
        provider,
        input_per_1k: (CONFIG.PRICE as any)[provider]?.in || CONFIG.PRICE.default.in,
        output_per_1k: (CONFIG.PRICE as any)[provider]?.out || CONFIG.PRICE.default.out
      }))
    });
  });

  // API capabilities endpoint
  app.get("/api/capabilities", (_req: Request, res: Response) => {
    res.json({
      endpoints: [
        { path: "/api/prompts/preview", method: "POST", description: "Single provider preview with metrics" },
        { path: "/api/prompts/generate", method: "POST", description: "Multi-provider generation with caching" },
        { path: "/api/code/analyze", method: "POST", description: "Chunked code analysis" },
        { path: "/api/jobs", method: "GET", description: "Job history" },
        { path: "/api/providers", method: "GET", description: "Available providers and pricing" }
      ],
      features: {
        gdpr_redaction: true,
        cost_estimation: true,
        quality_scoring: true,
        decision_explanation: true,
        parallel_processing: true,
        response_caching: true,
        job_persistence: true
      }
    });
  });
}