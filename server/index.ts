import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger } from "./observability/requestLogger";
import healthRouter from "./routes/health";
import { mountMetaRoutes } from "./routes/meta";
import { mountPromptRoutes } from "./routes/prompts";
import { mountCodeRoutes } from "./routes/code";
import { requireKey, tinyRateLimit } from "./middleware/secure";

const app = express();

// Security: Configure trust proxy for Replit environment (1 proxy hop)
// Only trust the first proxy, not arbitrary X-Forwarded-For chains
app.set('trust proxy', 1);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

// Add v2.2 observability: request logging with tracing
app.use(requestLogger);

// Keep existing API logging for backward compatibility with Vite logs
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add health endpoints (with rate limiting built-in)
  app.use(healthRouter);
  
  // Add security middleware for Quick Wins features
  app.use(requireKey);
  app.use(tinyRateLimit(180, 60_000));
  
  // Add API rate limiting for production endpoints
  const { apiRateLimit } = await import("./observability/rateLimiter");
  app.use("/api", apiRateLimit);
  
  // Mount Quick Wins routes
  mountMetaRoutes(app);
  mountPromptRoutes(app);
  mountCodeRoutes(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const reqId = (req.headers["x-request-id"] as string) || "unknown";

    // Log structured error without crashing the process
    console.error(JSON.stringify({
      level: "error",
      ts: new Date().toISOString(),
      reqId,
      error: {
        message: err.message,
        stack: err.stack,
        status
      },
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || "unknown"
    }));

    // Send error response if not already sent
    if (!res.headersSent) {
      res.status(status).json({ 
        message,
        requestId: reqId
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(JSON.stringify({ level: "info", message: "server listening", port, ts: new Date().toISOString() }));
    log(`serving on port ${port}`);
  });

  // Graceful shutdown (v2.2 enhancement)
  function shutdown(signal: string) {
    console.log(JSON.stringify({ level: "info", message: "shutting down", signal, ts: new Date().toISOString() }));
    server.close(async () => {
      try {
        // Close database pool connections
        const { pgPool } = await import("./db/pool");
        await pgPool.end();
        console.log(JSON.stringify({ level: "info", message: "database pool closed", ts: new Date().toISOString() }));
      } catch (e) {
        console.error(JSON.stringify({ level: "error", message: "error closing db pool", error: (e as Error).message, ts: new Date().toISOString() }));
      }
      process.exit(0);
    });
    // Fallback-Exit
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
})();
