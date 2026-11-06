import { currentAccount } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const account = await currentAccount();
  if (!account) return new Response(null, { status: 401 });
  const sql = getDb();
  const [document] = await sql<
    { file_name: string; mime_type: string; content: Buffer }[]
  >`
    select documents.file_name, documents.mime_type, documents.content
    from rbc_go.partner_documents documents
    join rbc_go.partner_applications applications on applications.id = documents.application_id
    where documents.id = ${id}
      and (
        applications.owner_account_id = ${account.id}
        or exists (select 1 from rbc_go.staff_members staff
                   where staff.account_id = ${account.id}
                     and staff.role in ('admin', 'reviewer'))
      )
  `;
  if (!document) return new Response(null, { status: 404 });
  const safeName = document.file_name.replace(/["\\\r\n]/g, "_");
  return new Response(new Uint8Array(document.content), {
    headers: {
      "Content-Type": document.mime_type,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
