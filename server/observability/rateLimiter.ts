import { Request, Response, NextFunction } from "express";

type Bucket = { hits: number; last: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 10_000);
const MAX_HITS = Number(process.env.RATE_LIMIT_MAX || 10);
const TTL_MS = Number(process.env.RATE_LIMIT_TTL_MS || 60_000);     // wie lange wir IPs halten
const MAX_BUCKETS = Number(process.env.RATE_LIMIT_MAX_BUCKETS || 5000); // Obergrenze

function clientIp(req: Request): string {
  // Use Express req.ip (respects trust proxy setting) for security
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Periodisches Cleanup to avoid unbounded growth
const CLEANUP_INTERVAL = Number(process.env.RATE_LIMIT_CLEANUP_MS || 30_000);
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of Array.from(buckets)) {
    if (now - b.last > TTL_MS) buckets.delete(ip);
  }
  // Optional: harte Kappung
  if (buckets.size > MAX_BUCKETS) {
    // Entferne älteste zuerst
    const sorted = Array.from(buckets.entries()).sort((a, b) => a[1].last - b[1].last);
    for (let i = 0; i < sorted.length - MAX_BUCKETS; i++) {
      buckets.delete(sorted[i][0]);
    }
  }
}, CLEANUP_INTERVAL).unref(); // blockiert Shutdown nicht

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = clientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip) || { hits: 0, last: now };

  // Reset window if außerhalb Fenster
  if (now - bucket.last > WINDOW_MS) {
    bucket.hits = 0;
    bucket.last = now;
  }

  bucket.hits += 1;
  bucket.last = now;
  buckets.set(ip, bucket);

  if (bucket.hits > MAX_HITS) {
    const retryAfter = Math.ceil(WINDOW_MS / 1000);
    res.set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': MAX_HITS.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(now + WINDOW_MS).toISOString()
    });
    return res.status(429).json({ 
      error: "Too Many Requests",
      retryAfter,
      requestId: (req.headers["x-request-id"] as string) || undefined
    });
  }

  next();
}

// Enhanced rate limiter for API endpoints
export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  const API_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);
  const API_MAX_HITS = Number(process.env.API_RATE_LIMIT_MAX || 100);
  
  const ip = clientIp(req);
  const now = Date.now();
  const bucketKey = `api:${ip}`;
  const bucket = buckets.get(bucketKey) || { hits: 0, last: now };

  if (now - bucket.last > API_WINDOW_MS) {
    bucket.hits = 0;
    bucket.last = now;
  }

  bucket.hits += 1;
  bucket.last = now;
  buckets.set(bucketKey, bucket);

  if (bucket.hits > API_MAX_HITS) {
    const retryAfter = Math.ceil(API_WINDOW_MS / 1000);
    res.set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': API_MAX_HITS.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(now + API_WINDOW_MS).toISOString()
    });
    return res.status(429).json({ 
      error: "API Rate Limit Exceeded",
      retryAfter,
      requestId: (req.headers["x-request-id"] as string) || undefined
    });
  }

  next();
}