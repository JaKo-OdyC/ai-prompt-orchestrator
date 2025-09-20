import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/module-manager/src/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dialect: "postgresql",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgres://user:pass@host:5432/db",
  },
});
