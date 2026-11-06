import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import test from "node:test";
import postgres from "postgres";
import { databaseSslOptions } from "../src/lib/server/database-ssl.mjs";

const poolerUrl =
  "postgresql://postgres.project:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

test("Supabase pooler uses the authentic, unexpired root CA with verification enabled", () => {
  const { ssl } = databaseSslOptions(poolerUrl, {});
  assert.equal(ssl?.rejectUnauthorized, true);
  assert.equal(ssl?.checkServerIdentity, undefined);
  assert.equal(typeof ssl?.ca, "string");
  const cert = new X509Certificate(ssl!.ca as string);
  assert.equal(
    cert.fingerprint256.replaceAll(":", ""),
    "807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA",
  );
  assert.equal(cert.ca, true);
  assert.equal(cert.verify(cert.publicKey), true);
  assert.ok(Date.now() > Date.parse(cert.validFrom));
  assert.ok(Date.now() < Date.parse(cert.validTo));
});

test("Postgres.js keeps the CA even when the connection URL specifies SSL mode", async () => {
  for (const port of [5432, 6543]) {
    for (const mode of ["", "?sslmode=require", "?sslmode=verify-full"]) {
      const url = poolerUrl.replace(":5432/", `:${port}/`) + mode;
      const options = databaseSslOptions(url, {});
      const sql = postgres(url, options);
      try {
        assert.deepEqual(sql.options.ssl, options.ssl);
        assert.equal(options.ssl?.rejectUnauthorized, true);
      } finally {
        await sql.end();
      }
    }
  }
});

test("local, other-provider, and lookalike hosts retain their SSL settings", async () => {
  for (const hostname of [
    "localhost",
    "127.0.0.1",
    "database.example.com",
    "aws-0-ap-south-1.pooler.supabase.com.example.com",
    "fakepooler.supabase.com",
  ]) {
    for (const query of ["", "?sslmode=verify-full"]) {
      const url = `postgresql://user:password@${hostname}/database${query}`;
      const options = databaseSslOptions(url, {});
      assert.deepEqual(options, {});
      const original = postgres(url);
      const configured = postgres(url, options);
      try {
        assert.equal(configured.options.ssl, original.options.ssl);
      } finally {
        await Promise.all([original.end(), configured.end()]);
      }
    }
  }
});

test("a custom CA overrides the bundled CA and supports deployment newline formats", () => {
  const ca = rootCertificates[0].trim();
  for (const url of [
    poolerUrl,
    "postgresql://user:password@db.example.com/db",
  ]) {
    for (const pem of [ca, ca.replaceAll("\n", "\\n")]) {
      assert.deepEqual(
        databaseSslOptions(url, { DATABASE_SSL_CA: ` ${pem} ` }),
        {
          ssl: { ca, rejectUnauthorized: true },
        },
      );
    }
  }
  assert.deepEqual(
    databaseSslOptions(poolerUrl, { DATABASE_SSL_CA: "  " }),
    databaseSslOptions(poolerUrl, {}),
  );
});
