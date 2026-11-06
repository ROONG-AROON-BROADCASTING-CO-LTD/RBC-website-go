import postgres from "postgres";

type Database = ReturnType<typeof postgres>;
type DatabaseGlobal = typeof globalThis & { __rbcGoDb?: Database };

export function getDb(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const globalForDb = globalThis as DatabaseGlobal;
  if (!globalForDb.__rbcGoDb) {
    globalForDb.__rbcGoDb = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
    });
  }
  return globalForDb.__rbcGoDb;
}
