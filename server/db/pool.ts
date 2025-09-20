import { Pool } from "pg";

function needsSSL(url: string | undefined) {
  if (!url) return false;
  return !/localhost|127\.0\.0\.1/.test(url);
}

const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  // Pool wird erst benutzt, wenn URL gesetzt ist – wir werfen hier bewusst nicht.
  // Health /ready meldet dann sauber "DATABASE_URL not set".
}

export const pgPool = new Pool({
  connectionString: DATABASE_URL || undefined,
  ssl: needsSSL(DATABASE_URL) 
    ? { 
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        // Allow CA override for development/testing
        ca: process.env.DB_SSL_CA || undefined
      } 
    : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000),
});

// Optional: einfache Pool-Event-Logs (nur bei DEBUG)
if ((process.env.LOG_LEVEL || "info") === "debug") {
  pgPool.on("error", (err) => {
    console.error(JSON.stringify({ level: "error", message: "pg pool error", error: err.message }));
  });
}