import { getDb } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ status: "database_unconfigured" }, { status: 503 });
  }

  try {
    const sql = getDb();
    await sql`select 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "database_unavailable" }, { status: 503 });
  }
}
