import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

interface DbState {
  client: Client;
  db: Db;
  ready: Promise<void>;
}

const globalForDb = globalThis as unknown as { __flowpilotDb?: DbState };

function init(): DbState {
  const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "flowpilot.db")}`;
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const db = drizzle(client, { schema });
  const ready = (async () => {
    if (url.startsWith("file:")) {
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("PRAGMA busy_timeout = 5000");
    }
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  })();
  return { client, db, ready };
}

/** Returns the database once migrations have been applied. */
export async function getDb(): Promise<Db> {
  globalForDb.__flowpilotDb ??= init();
  await globalForDb.__flowpilotDb.ready;
  return globalForDb.__flowpilotDb.db;
}

export { schema };
