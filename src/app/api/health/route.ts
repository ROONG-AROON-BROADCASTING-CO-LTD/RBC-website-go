import { getDb } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ status: "database_unconfigured" }, { status: 503 });
  }

  try {
    const sql = getDb();
    const [schema] = await sql<
      { version: number | null }[]
    >`select max(version)::integer as version from rbc_go.schema_migrations`;
    if ((schema.version ?? 0) < 14)
      return Response.json({ status: "migration_required" }, { status: 503 });
    return Response.json({ status: "ok", schemaVersion: schema.version });
  } catch {
    return Response.json({ status: "database_unavailable" }, { status: 503 });
  }
}
