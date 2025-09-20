import { appendJSONL, readJSONL } from "../lib/jsonl";

// Enhanced Job Entry structure
export type JobEntry = {
  jobId: string;
  ts: number;
  promptHash: string;
  providers: string[];
  modes: string[];
  decision?: {
    winner: string;
    rationale: string;
    ranking: { provider: string; score: number }[];
  };
  metricsByProvider: Record<string, any>;
  title?: string;
};

export const JobStore: { items: JobEntry[] } = { 
  items: readJSONL(200) as JobEntry[] 
};

export function addJob(entry: Omit<JobEntry, "ts">) {
  const full = { ...entry, ts: Date.now() };
  JobStore.items.unshift(full);
  if (JobStore.items.length > 200) JobStore.items.pop();
  appendJSONL(full);
  return full;
}