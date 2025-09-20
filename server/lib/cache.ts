import crypto from "crypto";

type Entry = { at: number; ttlMs: number; value: any };
const STORE = new Map<string, Entry>();

export const makeKey = (o: any) => crypto.createHash("sha1").update(JSON.stringify(o)).digest("hex");

export const getCache = (k: string) => {
  const e = STORE.get(k);
  if (!e) return null;
  if (Date.now() - e.at > e.ttlMs) {
    STORE.delete(k);
    return null;
  }
  return e.value;
};

export const setCache = (k: string, v: any, ttlMs = 120_000) => 
  STORE.set(k, { at: Date.now(), ttlMs, value: v });