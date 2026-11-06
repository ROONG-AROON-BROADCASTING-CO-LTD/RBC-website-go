import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const option = (...names) => {
  const index = args.findIndex((value) => names.includes(value));
  return index >= 0 ? args[index + 1] : undefined;
};
const env = {
  ...process.env,
  PORT: option("-p", "--port") ?? process.env.PORT ?? "3000",
  HOSTNAME: option("-H", "--hostname") ?? process.env.HOSTNAME ?? "0.0.0.0",
};
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  env,
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
