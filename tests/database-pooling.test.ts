import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { databaseSslOptions } from "../src/lib/server/database-ssl.mjs";

const url = process.env.RBC_GO_TEST_DATABASE_URL;
for (const max of [1, 4]) {
  for (const max_pipeline of [0, 1, 100]) {
    test(
      `pool ${max}, pipeline ${max_pipeline}: cold queries, transaction isolation and rollback`,
      { skip: !url, timeout: 15000 },
      async () => {
        assert.ok(new URL(url!).pathname.endsWith("_test"));
        const sql = postgres(url!, {
          ...databaseSslOptions(url!),
          max,
          max_pipeline,
          prepare: false,
          idle_timeout: 1,
        });
        try {
          const cold = await Promise.all(
            Array.from(
              { length: 12 },
              (_, i) => sql`select ${i}::integer as n`,
            ),
          );
          assert.deepEqual(
            cold.map((rows) => rows[0].n),
            Array.from({ length: 12 }, (_, i) => i),
          );
          let startOutside!: () => void;
          const begun = new Promise<void>((resolve) => {
            startOutside = resolve;
          });
          const transaction = sql.begin(async (tx) => {
            await tx`select set_config('rbc.pooling_marker', 'inside', true)`;
            startOutside();
            await tx`select pg_sleep(0.05)`;
            const rows = await Promise.all(
              Array.from(
                { length: 3 },
                () =>
                  tx`select current_setting('rbc.pooling_marker', true) as marker`,
              ),
            );
            for (const result of rows) assert.equal(result[0].marker, "inside");
          });
          await begun;
          const outside = sql`select current_setting('rbc.pooling_marker', true) as marker`;
          const [, rows] = await Promise.all([transaction, outside]);
          assert.notEqual(rows[0].marker, "inside");
          await assert.rejects(
            sql.begin(async (tx) => {
              await tx`select set_config('rbc.pooling_marker', 'rollback', true)`;
              throw new Error("intentional rollback");
            }),
            /intentional rollback/,
          );
          const [after] =
            await sql`select current_setting('rbc.pooling_marker', true) as marker`;
          assert.notEqual(after.marker, "rollback");
        } finally {
          await sql.end({ timeout: 1 });
        }
      },
    );
  }
}
