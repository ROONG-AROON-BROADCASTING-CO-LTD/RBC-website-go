import { mkdir, writeFile, chmod, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
if (!process.env.DATABASE_URL || !process.env.RBC_GO_BACKUP_DIR)
  throw new Error("Set DATABASE_URL and RBC_GO_BACKUP_DIR");
const directory = resolve(process.env.RBC_GO_BACKUP_DIR);
await mkdir(directory, { recursive: true, mode: 0o700 });
const destination = join(
  directory,
  `rbc-go-${new Date().toISOString().replaceAll(":", "-")}.dump`,
);
await writeFile(destination, "", { flag: "wx", mode: 0o600 });
try {
  const connection = new URL(process.env.DATABASE_URL);
  const connectionEnv = {
    PGHOST: connection.hostname.replace(/^\[|\]$/g, ""),
    PGPORT: connection.port || "5432",
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
    ...(connection.searchParams.get("sslmode")
      ? { PGSSLMODE: connection.searchParams.get("sslmode") }
      : {}),
  };
  const child = spawn(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-acl", `--file=${destination}`],
    {
      env: { ...process.env, ...connectionEnv },
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(`pg_dump exited with ${code}`);
  await chmod(destination, 0o600);
  console.log(`Backup created: ${destination}`);
} catch (error) {
  await unlink(destination);
  throw error;
}
