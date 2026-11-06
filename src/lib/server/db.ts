import postgres from "postgres";
import { databaseSslOptions } from "./database-ssl.mjs";
import { databaseRuntimeConfig } from "./database-runtime.mjs";

type Database = ReturnType<typeof postgres>;
type DatabaseGlobal = typeof globalThis & { __rbcGoDb?: Database };

export function getDb(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const globalForDb = globalThis as DatabaseGlobal;
  if (!globalForDb.__rbcGoDb) {
    const { connectionString: runtimeUrl, ...pool } =
      databaseRuntimeConfig(connectionString);
    globalForDb.__rbcGoDb = postgres(runtimeUrl, {
      ...databaseSslOptions(runtimeUrl),
      ...pool,
    });
  }
  return globalForDb.__rbcGoDb;
}
