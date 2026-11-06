import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { once } from "node:events";

const supplied = process.env.RBC_GO_TEST_DATABASE_URL;
const database = new URL(
  supplied || process.env.DATABASE_URL || "postgresql://localhost/rbc_go_test",
);
if (!supplied) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname))
    throw new Error(
      "Set RBC_GO_TEST_DATABASE_URL explicitly for a remote test database",
    );
  database.pathname = "/rbc_go_test";
}
if (!database.pathname.endsWith("_test"))
  throw new Error("Integration tests require a database ending in _test");
const env = {
  ...process.env,
  DATABASE_URL: database.toString(),
  RBC_GO_TEST_DATABASE_URL: database.toString(),
  // Integration fixtures never send messages or use real provider credentials.
  EMAIL_PROVIDER: "resend",
  GMAIL_USER: "",
  GMAIL_APP_PASSWORD: "",
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  TWILIO_API_KEY: "",
  TWILIO_API_SECRET: "",
  TWILIO_VERIFY_SERVICE_SID: "",
  OMISE_PUBLIC_KEY: "pkey_test_ci",
  OMISE_SECRET_KEY: "skey_test_ci",
  OMISE_MODE: "test",
  ENABLE_LIVE_PAYMENTS: "false",
  // Legacy demo routes stay unavailable even if an old deployment enables them.
  ENABLE_DEMO: "true",
};
const baseUrl = "http://localhost:3101";
env.RBC_GO_TEST_BASE_URL = baseUrl;
env.APP_BASE_URL = baseUrl;

async function run(args) {
  const child = spawn(process.execPath, args, { env, stdio: "inherit" });
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(`Command failed (${code}): ${args[0]}`);
}

// Keep test schemas current before opening the app. Never migrate the main DB.
await run(["scripts/migrate.mjs"]);
await run(["node_modules/next/dist/bin/next", "build", "--webpack"]);
await run(["scripts/prepare-standalone.mjs"]);
const server = spawn(
  process.execPath,
  ["scripts/start.mjs", "-H", "localhost", "-p", "3101"],
  { env, stdio: "inherit" },
);
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Test server exited before becoming ready");
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait until the local server is listening. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("Test server did not become healthy");
  const files = (await readdir("tests"))
    .filter((name) => name.endsWith(".test.ts"))
    .map((name) => `tests/${name}`);
  await run(["--import", "tsx", "--test", ...files]);
} finally {
  server.kill("SIGTERM");
  await once(server, "exit");
}
