import fs from "fs";
import path from "path";

const FILE = process.env.JOBS_JSONL || path.join(process.cwd(), "jobs.jsonl");

export const appendJSONL = (o: any) => {
  try {
    fs.appendFileSync(FILE, JSON.stringify(o) + "\n", "utf8");
  } catch (error) {
    console.warn("Failed to append to JSONL:", error);
  }
};

export const readJSONL = (limit = 200) => {
  try {
    if (!fs.existsSync(FILE)) return [];
    return fs.readFileSync(FILE, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map(l => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Failed to read JSONL:", error);
    return [];
  }
};