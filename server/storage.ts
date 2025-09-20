import { type User, type InsertUser, type PromptJob, type InsertPromptJob, type GeneratedPrompt, type InsertGeneratedPrompt } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createPromptJob(job: InsertPromptJob): Promise<PromptJob>;
  getPromptJob(id: string): Promise<PromptJob | undefined>;
  updatePromptJobStatus(id: string, status: string): Promise<void>;
  
  createGeneratedPrompt(prompt: InsertGeneratedPrompt): Promise<GeneratedPrompt>;
  getGeneratedPromptsByJob(jobId: string): Promise<GeneratedPrompt[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private promptJobs: Map<string, PromptJob>;
  private generatedPrompts: Map<string, GeneratedPrompt>;

  constructor() {
    this.users = new Map();
    this.promptJobs = new Map();
    this.generatedPrompts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPromptJob(insertJob: InsertPromptJob): Promise<PromptJob> {
    const id = randomUUID();
    const job: PromptJob = { 
      ...insertJob, 
      id, 
      status: insertJob.status || 'pending',
      createdAt: new Date()
    };
    this.promptJobs.set(id, job);
    return job;
  }

  async getPromptJob(id: string): Promise<PromptJob | undefined> {
    return this.promptJobs.get(id);
  }

  async updatePromptJobStatus(id: string, status: string): Promise<void> {
    const job = this.promptJobs.get(id);
    if (job) {
      job.status = status;
      this.promptJobs.set(id, job);
    }
  }

  async createGeneratedPrompt(insertPrompt: InsertGeneratedPrompt): Promise<GeneratedPrompt> {
    const id = randomUUID();
    const prompt: GeneratedPrompt = {
      ...insertPrompt,
      id,
      createdAt: new Date()
    };
    this.generatedPrompts.set(id, prompt);
    return prompt;
  }

  async getGeneratedPromptsByJob(jobId: string): Promise<GeneratedPrompt[]> {
    return Array.from(this.generatedPrompts.values()).filter(
      prompt => prompt.jobId === jobId
    );
  }
}

export const storage = new MemStorage();
