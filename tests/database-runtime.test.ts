import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { databaseRuntimeConfig } from "../src/lib/server/database-runtime.mjs";
import { databaseSslOptions } from "../src/lib/server/database-ssl.mjs";

const sessionUrl =
  "postgresql://postgres.project:p%40ss%3Aword@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=verify-full";

test("Vercel uses the same Supabase credentials in transaction mode with one non-pipelined connection", async () => {
  const { connectionString, ...pool } = databaseRuntimeConfig(sessionUrl, {
    VERCEL: "1",
  });
  const original = new URL(sessionUrl),
    actual = new URL(connectionString);
  assert.equal(actual.port, "6543");
  for (const key of [
    "hostname",
    "username",
    "password",
    "pathname",
    "search",
  ] as const)
    assert.equal(actual[key], original[key]);
  const sql = postgres(connectionString, {
    ...pool,
    ...databaseSslOptions(connectionString, {}),
  });
  try {
    assert.equal(sql.options.max, 1);
    assert.equal(sql.options.max_pipeline, 0);
    assert.equal(sql.options.prepare, false);
    assert.equal(sql.options.port[0], 6543);
    assert.equal(
      (sql.options.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized,
      true,
    );
  } finally {
    await sql.end();
  }
});

test("local, direct, custom ports and lookalike hosts are never redirected", () => {
  assert.equal(
    databaseRuntimeConfig(sessionUrl, {}).connectionString,
    sessionUrl,
  );
  assert.equal(databaseRuntimeConfig(sessionUrl, {}).max, 5);
  for (const url of [
    "postgresql://user:pass@localhost:5432/rbc_go_test",
    "postgresql://user:pass@db.project.supabase.co:5432/postgres",
    "postgresql://user:pass@aws-0-ap-south-1.pooler.supabase.com.evil.test:5432/postgres",
    sessionUrl.replace(":5432/", ":5555/"),
  ])
    assert.equal(
      databaseRuntimeConfig(url, { VERCEL: "1" }).connectionString,
      url,
    );
  for (const env of [{}, { VERCEL: "1" }]) {
    const config = databaseRuntimeConfig(
      sessionUrl.replace(":5432/", ":6543/"),
      env,
    );
    assert.equal(new URL(config.connectionString).port, "6543");
    assert.equal(config.max_pipeline, 0);
  }
});
