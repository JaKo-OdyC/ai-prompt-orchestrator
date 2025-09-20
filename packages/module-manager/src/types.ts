export type ModuleKind = "tool" | "service" | "agent";
export type ModuleStatus = "connected" | "disconnected" | "error" | "unknown";

export interface ModuleCapability { id: string; label: string; }
export interface ModuleDescriptor { id: string; name: string; kind: ModuleKind; description?: string; capabilities?: ModuleCapability[]; meta?: Record<string, unknown>; }
export interface ModuleRecord extends ModuleDescriptor { status: ModuleStatus; lastSync?: string; config?: Record<string, unknown>; }
export interface ModuleStorage { list(): Promise<ModuleRecord[]>; get(id: string): Promise<ModuleRecord | undefined>; upsert(record: ModuleRecord): Promise<void>; remove(id: string): Promise<void>; }
export type ManagerEvent =
  | { type: "statusChanged"; id: string; status: ModuleStatus }
  | { type: "configChanged"; id: string; config: Record<string, unknown> }
  | { type: "moduleAdded"; record: ModuleRecord }
  | { type: "moduleRemoved"; id: string };
