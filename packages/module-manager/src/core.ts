import type { ModuleRecord, ModuleStorage, ManagerEvent, ModuleStatus } from "./types";
export class ModuleManager {
  private listeners = new Set<(ev: ManagerEvent) => void>();
  constructor(private store: ModuleStorage) {}
  subscribe(cb: (ev: ManagerEvent) => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit(ev: ManagerEvent) { this.listeners.forEach(l => l(ev)); }
  async list() { return this.store.list(); }
  async get(id: string) { return this.store.get(id); }
  async upsert(r: ModuleRecord) { await this.store.upsert(r); this.emit({ type: "moduleAdded", record: r }); }
  async remove(id: string) { await this.store.remove(id); this.emit({ type: "moduleRemoved", id }); }
  async setStatus(id: string, status: ModuleStatus) { const rec = await this.store.get(id); if (!rec) return; rec.status = status; rec.lastSync = new Date().toISOString(); await this.store.upsert(rec); this.emit({ type: "statusChanged", id, status }); }
  async setConfig(id: string, config: Record<string, unknown>) { const rec = await this.store.get(id); if (!rec) return; rec.config = { ...(rec.config ?? {}), ...config }; await this.store.upsert(rec); this.emit({ type: "configChanged", id, config: rec.config! }); }
  async connect(id: string) { await this.setStatus(id, "connected"); }
  async disconnect(id: string) { await this.setStatus(id, "disconnected"); }
}
