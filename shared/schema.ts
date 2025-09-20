import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const promptJobs = pgTable("prompt_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  feature: text("feature"),
  acceptance: text("acceptance"),
  useCaseId: text("use_case_id"),
  providers: json("providers").$type<string[]>().notNull(),
  modes: json("modes").$type<string[]>().notNull(),
  maxLines: integer("max_lines").notNull().default(120),
  files: json("files").$type<UploadedFile[]>().notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const generatedPrompts = pgTable("generated_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => promptJobs.id),
  provider: text("provider").notNull(),
  mode: text("mode").notNull(),
  content: text("content").notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPromptJobSchema = createInsertSchema(promptJobs).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedPromptSchema = createInsertSchema(generatedPrompts).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PromptJob = typeof promptJobs.$inferSelect;
export type InsertPromptJob = z.infer<typeof insertPromptJobSchema>;
export type GeneratedPrompt = typeof generatedPrompts.$inferSelect;
export type InsertGeneratedPrompt = z.infer<typeof insertGeneratedPromptSchema>;

export interface UploadedFile {
  name: string;
  size: number;
  content: string;
}

export interface PromptRequest {
  title: string;
  feature?: string;
  acceptance?: string;
  useCaseId?: string;
  providers: string[];
  modes: string[];
  maxLines: number;
  files: UploadedFile[];
}

export interface PromptPreview {
  provider: string;
  mode: string;
  content: string;
}

// RobustKit schemas for normalized AI provider responses
export const runInputSchema = z.object({
  provider: z.string(),
  model: z.string(),
  prompt: z.string(),
  temperature: z.number().min(0).max(2).optional().default(0.2),
  mode: z.enum(['draft', 'live', 'dry']).optional().default('draft'),
});

export const runOutputSchema = z.object({
  provider: z.string(),
  model: z.string(),
  status: z.enum(['ok', 'error']),
  latency_ms: z.number().min(0),
  text: z.string().optional(),
  tokens: z.number().min(0).optional(),
  error: z.string().optional(),
});

export type RunInput = z.infer<typeof runInputSchema>;
export type RunOutput = z.infer<typeof runOutputSchema>;
