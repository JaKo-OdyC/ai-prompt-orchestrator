import type { ModuleRecord, ModuleStorage } from "./types";
export class MemoryStorage implements ModuleStorage {
  private map = new Map<string, ModuleRecord>();
  async list() { return [...this.map.values()]; }
  async get(id: string) { return this.map.get(id); }
  async upsert(record: ModuleRecord) { this.map.set(record.id, record); }
  async remove(id: string) { this.map.delete(id); }
}
