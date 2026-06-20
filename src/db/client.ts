import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const databaseUrl =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "file:./data/verona.db";

const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

if (process.env.VERCEL === "1" && !process.env.TURSO_DATABASE_URL && !process.env.DATABASE_URL) {
  throw new Error("Database env vars are required on Vercel");
}

export const libsql = createClient({
  url: databaseUrl,
  authToken,
});

export const db = drizzle(libsql, { schema });
