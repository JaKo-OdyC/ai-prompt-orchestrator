import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

const muteHealth = (process.env.MUTE_HEALTH_LOGS || "true").toLowerCase() === "true";

function nowHiRes(): number {
  // Node 18+: performance.now, Fallback Date.now
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return (globalThis.performance?.now?.() as number | undefined) ?? Date.now();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Reuse incoming request-id or create a new one
  const reqId = (req.headers["x-request-id"] as string) || randomUUID();
  res.setHeader("x-request-id", reqId);

  const start = nowHiRes();

  // Option: Health-Endpunkte ausblenden
  const isHealth = req.path.startsWith("/health");

  // Log at finish
  res.on("finish", () => {
    if (muteHealth && isHealth) return;

    const durationMs = Math.max(0, nowHiRes() - start);
    const entry = {
      level: "info",
      ts: new Date().toISOString(),
      reqId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userId: (req.headers["x-user-id"] as string) || undefined,
      userRole: (req.headers["x-user-role"] as string) || undefined,
    };
    console.log(JSON.stringify(entry));
  });

  next();
}