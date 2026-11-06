// Rebuild the pinned 3.4.7 archive with the narrowly scoped reservation fix.
// Keep onexecute's falsy return: a BEGIN must never re-enter the shared queue.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const temp = await mkdtemp(join(tmpdir(), "rbc-postgres-vendor-"));
execFileSync("tar", ["-xzf", "vendor/postgres-3.4.7.tgz", "-C", temp]);
const before = `      return write(toBuffer(q))
        && !q.describeFirst
        && !q.cursorFn
        && sent.length < max_pipeline
        && (!q.options.onexecute || q.options.onexecute(connection))`;
const after = `      const written = write(toBuffer(q))
      const reservable = !q.options.onexecute || q.options.onexecute(connection)
      return written
        && !q.describeFirst
        && !q.cursorFn
        && reservable
        && sent.length < max_pipeline`;
for (const entry of ["src", "cjs/src", "cf/src"]) {
  const file = join(temp, "package", entry, "connection.js");
  const source = await readFile(file, "utf8");
  if (source.split(before).length !== 2)
    throw new Error(`Unexpected vendor source: ${entry}`);
  await writeFile(file, source.replace(before, after));
}
const types = join(temp, "package/types/index.d.ts");
await writeFile(
  types,
  (await readFile(types, "utf8")).replace(
    "  max: number;",
    "  max: number;\n  /** Maximum additional queries pipelined on a connection; 0 disables pipelining. */\n  max_pipeline: number;",
  ),
);
const manifest = join(temp, "package/package.json");
const pkg = JSON.parse(await readFile(manifest, "utf8"));
pkg.version = "3.4.7-rbc.1";
await writeFile(manifest, JSON.stringify(pkg, null, 2) + "\n");
execFileSync(
  "tar",
  ["-czf", resolve("vendor/postgres-3.4.7-rbc.1.tgz"), "-C", temp, "package"],
  { env: { ...process.env, COPYFILE_DISABLE: "1" } },
);
console.log(
  "Built postgres-3.4.7-rbc.1.tgz (ESM, CommonJS, worker entry points).",
);
