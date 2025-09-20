export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000, operation = "operation"): Promise<T> {
  let t: any;
  const to = new Promise<never>((_, rej) => { t = setTimeout(() => rej(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs); });
  try { return await Promise.race([promise, to]); } finally { clearTimeout(t); }
}

export async function withRetry<T>(fn: () => Promise<T>, opts: { attempts?: number; baseDelayMs?: number; maxDelayMs?: number; backoffMultiplier?: number; operation?: string } = {}) {
  const { attempts = 3, baseDelayMs = 300, maxDelayMs = 5000, backoffMultiplier = 2, operation = "operation" } = opts;
  let last: any;
  for (let i=1;i<=attempts;i++) {
    try { return await fn(); }
    catch (e:any) {
      last = e;
      if (i===attempts) throw new Error(`${operation} failed after ${attempts} attempts: ${e.message}`);
      const delay = Math.min(baseDelayMs * Math.pow(backoffMultiplier, i-1), maxDelayMs);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw last;
}

export type CircuitState = "closed" | "open" | "half-open";
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFail = 0;
  constructor(private threshold=3, private cooldownMs=10000, private name="circuit"){}
  canProceed(){ if(this.state==="closed") return true; if(this.state==="open"){ if(Date.now()-this.lastFail>this.cooldownMs){ this.state="half-open"; return true; } return false; } return true; }
  recordSuccess(){ this.failures=0; this.state="closed"; }
  recordFailure(){ this.failures++; this.lastFail=Date.now(); if(this.failures>=this.threshold) this.state="open"; }
  getState(){ return { state: this.state, failures: this.failures }; }
}
export const circuitBreakers = {
  database: new CircuitBreaker(3, 10000, "database"),
  encryption: new CircuitBreaker(5, 5000, "encryption"),
  external: new CircuitBreaker(2, 15000, "external"),
};
