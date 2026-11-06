import postgres from "postgres";
import { readdir } from "node:fs/promises";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set DATABASE_URL before running the migration");
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  const directory = new URL("../db/migrations/", import.meta.url);
  const files = (await readdir(directory))
    .filter((name) => /^\d{3}_[\w-]+\.sql$/.test(name))
    .sort();
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    const [row] = await sql`
      select to_regclass('rbc_go.schema_migrations') is not null as installed
    `;
    const [applied] = row.installed
      ? await sql`select version from rbc_go.schema_migrations where version = ${version}`
      : [];
    if (applied) continue;
    await sql.file(new URL(file, directory));
    process.stdout.write(`Applied RBC GO migration ${version}.\n`);
  }
} finally {
  await sql.end();
}
