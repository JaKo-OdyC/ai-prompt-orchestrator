export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext { operation?: string; moduleId?: string; userId?: string; duration?: number; error?: string; [k: string]: any; }

export function log(level: LogLevel, message: string, ctx: LogContext = {}) {
  const entry = { level, message, ts: new Date().toISOString(), ...ctx };
  console.log(JSON.stringify(entry));
}
export const logger = {
  debug: (m:string,c?:LogContext)=>log("debug",m,c),
  info:  (m:string,c?:LogContext)=>log("info",m,c),
  warn:  (m:string,c?:LogContext)=>log("warn",m,c),
  error: (m:string,c?:LogContext)=>log("error",m,c),
};
export async function withLogging<T>(operation: string, fn: () => Promise<T>) {
  const start = Date.now();
  try { const res = await fn(); log("info", `ok:${operation}`, { duration: Date.now()-start }); return res; }
  catch (e:any){ log("error", `fail:${operation}`, { duration: Date.now()-start, error: e.message }); throw e; }
}
