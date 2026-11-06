/**
 * Vercel functions must not hold Supabase's small session pool per instance.
 * The same shared-pooler host and credentials use transaction mode on 6543.
 * Migration/backup scripts keep the original DATABASE_URL and session behavior.
 * @param {string} connectionString
 * @param {Record<string, string | undefined>} env
 */
export function databaseRuntimeConfig(connectionString, env = process.env) {
  const url = new URL(connectionString);
  const serverless = env.VERCEL === "1";
  const sharedPooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(
    url.hostname,
  );
  if (serverless && sharedPooler && (!url.port || url.port === "5432"))
    url.port = "6543";
  return {
    connectionString: url.toString(),
    max: serverless ? 1 : 5,
    // Supavisor transaction pooling cannot accept pipelined queries.
    max_pipeline: serverless || (sharedPooler && url.port === "6543") ? 0 : 100,
    idle_timeout: serverless ? 5 : 20,
    connect_timeout: 10,
    prepare: false,
  };
}
