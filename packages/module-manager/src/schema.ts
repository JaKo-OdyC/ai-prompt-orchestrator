import { pgTable, text, timestamp, jsonb, pgEnum, integer } from "drizzle-orm/pg-core";
import { z } from "zod";

export const moduleKindEnum = pgEnum("module_kind", ["tool", "service", "agent"]);
export const moduleStatusEnum = pgEnum("module_status", ["connected", "disconnected", "error", "unknown"]);

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: moduleKindEnum("kind").notNull(),
  status: moduleStatusEnum("status").notNull().default("unknown"),
  description: text("description"),
  capabilities: jsonb("capabilities").$type<any[]>().default([]),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  configEnc: text("config_enc"),
  lastSync: timestamp("last_sync", { mode: "string" }),
  updatedBy: text("updated_by"),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const moduleEvents = pgTable("module_events", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").notNull(),
  type: text("type").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  actor: text("actor"),
  at: timestamp("at", { mode: "string" }).defaultNow().notNull(),
});

export const ModuleRecordZ = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  kind: z.enum(["tool","service","agent"]),
  status: z.enum(["connected","disconnected","error","unknown"]).default("unknown"),
  description: z.string().max(1000).optional(),
  capabilities: z.any().optional(),
  meta: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
  lastSync: z.string().optional(),
});

export const UpsertRequestZ = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  kind: z.enum(["tool","service","agent"]),
  status: z.enum(["connected","disconnected","error","unknown"]).optional(),
  config: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
  description: z.string().max(1000).optional(),
  capabilities: z.any().optional(),
});
