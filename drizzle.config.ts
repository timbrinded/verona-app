import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./data/verona.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
const isRemoteTurso = databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isRemoteTurso ? "turso" : "sqlite",
  dbCredentials: isRemoteTurso ? { url: databaseUrl, authToken } : { url: databaseUrl },
});
