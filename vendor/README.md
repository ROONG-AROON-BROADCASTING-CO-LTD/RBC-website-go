# Pinned PostgreSQL driver

`postgres-3.4.7.tgz` is the existing baseline archive. `postgres-3.4.7-rbc.1.tgz` adds one reservation-hook ordering fix to all three runtime entry points plus the existing `max_pipeline` option's TypeScript declaration. Rebuild with `node scripts/build-postgres-vendor.mjs`.

Supabase shared transaction pooling does not support pipelining. In Postgres.js 3.4.7, `max_pipeline: 1` still permits a second query in flight, and `max_pipeline: 0` skips the `sql.begin()` reservation hook. This patch always runs that hook after writing, before checking pipeline capacity, while retaining its falsy result so unrelated queries cannot enter the transaction. This is deliberately not the unsafe version of the upstream change that drops the hook's result.

References: [Supabase Postgres.js limitations](https://supabase.com/docs/guides/database/postgres-js), [upstream issue 1210](https://github.com/porsager/postgres/issues/1210), [transaction isolation regression discussion](https://github.com/porsager/postgres/pull/1211).

Regression coverage checks concurrent cold-start queries, transaction-local state isolation, rollback and connection reuse for pool sizes 1 and 4 at pipeline limits 0, 1 and 100. Vercel uses one connection with pipelining disabled. Replace the local patch with a verified upstream release when the project's next driver upgrade is evaluated.
