import express, { Router, Request, Response } from "express";
import crypto from "crypto";
import { pgPool } from "../db/pool";
import { rateLimit } from "../observability/rateLimiter";

const router: Router = express.Router();

const HEALTH_TOKEN = process.env.HEALTH_TOKEN || "";
const TEST_STRING = process.env.HEALTH_TEST_STRING || "health";
const READY_TIMEOUT_MS = Number(process.env.READY_TIMEOUT_MS || 5000);

function requireHealthToken(req: Request, res: Response, next: Function) {
  if (!HEALTH_TOKEN) return next();
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${HEALTH_TOKEN}`) return next();
  return res.status(401).json({ error: "UNAUTHORIZED" });
}

function cryptoRoundtrip(): { ok: boolean; message?: string } {
  try {
    const secret = process.env.CONFIG_SECRET || "";
    if (secret.length < 32) {
      return { ok: false, message: "CONFIG_SECRET missing or < 32 chars" };
    }
    const key = crypto.createHash("sha256").update(secret).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(Buffer.from(TEST_STRING, "utf8")), cipher.final()]);
    const tag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return { ok: dec.toString("utf8") === TEST_STRING };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

/** Liveness: läuft der Prozess? */
router.get("/health/live", rateLimit, (_req: Request, res: Response) => {
  res.json({
    status: "alive",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "dev",
  });
});

/** Readiness: Crypto + DB (mit Pool, Timeout & optional Token) */
router.get("/health/ready", rateLimit, requireHealthToken, async (_req: Request, res: Response) => {
  const status: any = {
    status: "ready",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "dev",
  };

  // Crypto
  const c = cryptoRoundtrip();
  status.encryption = c.ok ? "ok" : `error: ${c.message || "unknown"}`;
  if (!c.ok) status.status = "unready";

  // DB (nur prüfen, wenn URL da ist)
  if (!process.env.DATABASE_URL) {
    status.database = "error: DATABASE_URL not set";
    status.status = "unready";
  } else {
    try {
      // Use Promise.race for timeout control with Pool's built-in timeout
      const healthCheck = async () => {
        const client = await pgPool.connect();
        try {
          const r = await client.query("select 1 as ok");
          return r.rows[0]?.ok === 1 ? "ok" : "error";
        } finally {
          client.release();
        }
      };

      const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("health check timeout")), READY_TIMEOUT_MS)
      );

      status.database = await Promise.race([healthCheck(), timeout]);
      if (status.database !== "ok") status.status = "unready";
    } catch (e: any) {
      status.database = `error: ${e.message}`;
      status.status = "unready";
    }
  }

  res.status(status.status === "ready" ? 200 : 503).json(status);
});

export default router;