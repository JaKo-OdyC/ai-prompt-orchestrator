import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { modules, moduleEvents, ModuleRecordZ } from "./schema";
import type { ModuleRecord } from "./types";
import { encryptConfig, decryptConfig } from "./crypto";
import { withTimeout, withRetry, circuitBreakers } from "./resilience";
import { logger } from "./logger";
import type { AuthContext } from "./auth";
import { normalizeCapabilities } from "./validation";

export class PostgresModuleStorage {
  constructor(private db: any) {}

  async upsert(record: ModuleRecord, auth?: AuthContext): Promise<void> {
    const validation = ModuleRecordZ.safeParse(record);
    if (!validation.success) throw new Error(`Validation failed: ${validation.error.message}`);
    if (!circuitBreakers.database.canProceed()) throw new Error("Database circuit breaker open");

    try {
      await withRetry(
        () => withTimeout(this._performUpsert({ ...record, capabilities: normalizeCapabilities((record as any).capabilities) }, auth), 5000, "upsert"),
        { attempts: 3, operation: "database upsert" }
      );
      circuitBreakers.database.recordSuccess();
    } catch (e) { circuitBreakers.database.recordFailure(); throw e; }
  }

  private async _performUpsert(record: ModuleRecord, auth?: AuthContext): Promise<void> {
    // Note: neon-http driver doesn't support transactions, so we do individual operations
    const existing = await this._performGet(record.id);
    const now = new Date().toISOString();
    const nextVersion = (existing?.version ?? 0) + 1;

    let configEnc: string | null = existing?.configEnc ?? null;
    if ((record as any).config && Object.keys((record as any).config).length > 0) {
      if (!circuitBreakers.encryption.canProceed()) throw new Error("Encryption circuit breaker open");
      try { configEnc = encryptConfig((record as any).config); circuitBreakers.encryption.recordSuccess(); }
      catch { circuitBreakers.encryption.recordFailure(); throw new Error("Config encryption failed"); }
    }

    const moduleData: any = {
      id: record.id,
      name: record.name,
      kind: (record as any).kind,
      status: (record as any).status,
      description: (record as any).description ?? null,
      capabilities: (record as any).capabilities ?? [],
      meta: (record as any).meta ?? {},
      configEnc,
      lastSync: (record as any).lastSync ? new Date((record as any).lastSync).toISOString() : existing?.lastSync ?? null,
      updatedBy: auth?.userId ?? null,
      updatedAt: now,
      createdAt: existing?.createdAt ?? now,
      version: nextVersion,
    };

    if (existing) {
      // Update existing module
      await this.db.update(modules).set(moduleData).where(eq(modules.id, record.id));
      // Log the event (best effort)
      try {
        await this.db.insert(moduleEvents).values({ 
          id: randomUUID(), 
          moduleId: record.id, 
          type: "moduleUpdated", 
          before: { ...existing, config: undefined }, 
          after: { ...(record as any), config: undefined }, 
          actor: auth?.userId ?? null, 
          at: now 
        });
      } catch (e) {
        logger.warn("Failed to log module update event", { moduleId: record.id, error: (e as Error).message });
      }
      logger.info("Module updated", { moduleId: record.id, userId: auth?.userId, version: nextVersion });
    } else {
      // Insert new module
      await this.db.insert(modules).values(moduleData);
      // Log the event (best effort)
      try {
        await this.db.insert(moduleEvents).values({ 
          id: randomUUID(), 
          moduleId: record.id, 
          type: "moduleAdded", 
          before: null, 
          after: { ...(record as any), config: undefined }, 
          actor: auth?.userId ?? null, 
          at: now 
        });
      } catch (e) {
        logger.warn("Failed to log module add event", { moduleId: record.id, error: (e as Error).message });
      }
      logger.info("Module added", { moduleId: record.id, userId: auth?.userId });
    }
  }

  async get(id: string, includeSensitive: boolean = false) {
    if (!circuitBreakers.database.canProceed()) throw new Error("Database circuit breaker open");
    try {
      const res = await withRetry(() => withTimeout(this._performGet(id, includeSensitive), 3000, "get"), { attempts: 2, operation: "database get" });
      circuitBreakers.database.recordSuccess(); return res;
    } catch (e) { circuitBreakers.database.recordFailure(); throw e; }
  }
  private async _performGet(id: string, includeSensitive: boolean = false) {
    const rows = await this.db.select().from(modules).where(eq(modules.id, id)).limit(1);
    if (rows.length===0) return undefined;
    return includeSensitive ? this._hydrate(rows[0]) : this._hydrateSafe(rows[0]);
  }
  private _hydrate(row: any): any {
    let config: Record<string, unknown> | undefined;
    if (row.configEnc) {
      try { config = decryptConfig(row.configEnc); }
      catch (e:any){ logger.error("Config decrypt failed", { moduleId: row.id, error: e.message }); }
    }
    return { id: row.id, name: row.name, kind: row.kind, status: row.status, description: row.description, capabilities: row.capabilities || [], meta: row.meta || {}, config, lastSync: row.lastSync, createdAt: row.createdAt, updatedAt: row.updatedAt, version: row.version };
  }

  // Security-safe version that excludes sensitive configuration data
  private _hydrateSafe(row: any): any {
    return { id: row.id, name: row.name, kind: row.kind, status: row.status, description: row.description, capabilities: row.capabilities || [], meta: row.meta || {}, lastSync: row.lastSync, createdAt: row.createdAt, updatedAt: row.updatedAt, version: row.version };
  }

  async list() {
    if (!circuitBreakers.database.canProceed()) throw new Error("Database circuit breaker open");
    try {
      const res = await withRetry(() => withTimeout(this._performList(), 5000, "list"), { attempts: 2, operation: "database list" });
      circuitBreakers.database.recordSuccess(); return res;
    } catch (e) { circuitBreakers.database.recordFailure(); throw e; }
  }
  private async _performList() {
    const rows = await this.db.select().from(modules);
    return rows.map((r:any)=>this._hydrateSafe(r));
  }

  async remove(id: string, auth?: AuthContext) {
    if (!circuitBreakers.database.canProceed()) throw new Error("Database circuit breaker open");
    try {
      await withRetry(() => withTimeout(this._performRemove(id, auth), 3000, "remove"), { attempts: 2, operation: "database remove" });
      circuitBreakers.database.recordSuccess();
    } catch (e) { circuitBreakers.database.recordFailure(); throw e; }
  }
  private async _performRemove(id: string, auth?: AuthContext) {
    // Note: neon-http driver doesn't support transactions, so we do individual operations
    const existing = await this._performGet(id);
    await this.db.delete(modules).where(eq(modules.id, id));
    
    // Log the event (best effort)
    try {
      await this.db.insert(moduleEvents).values({ 
        id: randomUUID(), 
        moduleId: id, 
        type: "moduleRemoved", 
        before: existing ? { ...existing, config: undefined } : null, 
        after: null, 
        actor: auth?.userId ?? null, 
        at: new Date().toISOString() 
      });
    } catch (e) {
      logger.warn("Failed to log module remove event", { moduleId: id, error: (e as Error).message });
    }
    
    logger.info("Module removed", { moduleId: id, userId: auth?.userId });
  }

  async getAuditLog(moduleId?: string, limit=50){
    let q = this.db.select().from(moduleEvents);
    if (moduleId) q = q.where(eq(moduleEvents.moduleId, moduleId));
    const rows = await q.orderBy(desc(moduleEvents.at)).limit(limit);
    return rows;
  }
}
