import type { Request, Response, NextFunction } from "express";

const API_KEY = process.env.API_KEY;
const bucket: Record<string, { ts: number; count: number }> = {};

export function requireKey(req: Request, res: Response, next: NextFunction) {
  if (!API_KEY) return next();
  if (req.get("x-api-key") !== API_KEY) return res.status(401).send("Unauthorized");
  next();
}

export function tinyRateLimit(limit = 120, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || "local";
    const now = Date.now();
    const b = bucket[ip] ?? (bucket[ip] = { ts: now, count: 0 });
    if (now - b.ts > windowMs) {
      b.ts = now;
      b.count = 0;
    }
    if (++b.count > limit) return res.status(429).send("Too Many Requests");
    next();
  };
}