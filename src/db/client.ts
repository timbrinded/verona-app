import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const databaseUrl =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "file:./data/verona.db";

const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const libsql = createClient({
  url: databaseUrl,
  authToken,
});

export const db = drizzle(libsql, { schema });
