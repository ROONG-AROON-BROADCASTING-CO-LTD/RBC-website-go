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
  const sql = getDb();
  const [image] = await sql<{ mime_type: string; content: Buffer }[]>`
    select images.mime_type, images.content
    from rbc_go.listing_images images
    join rbc_go.listings listings on listings.id = images.listing_id
    join rbc_go.partners partners on partners.id = listings.partner_id
    where images.id = ${id}
      and (
        (listings.status = 'approved' and partners.status = 'active')
        or
        exists (select 1 from rbc_go.partner_members members
                where members.partner_id = listings.partner_id
                  and members.account_id = ${account?.id ?? null})
        or exists (select 1 from rbc_go.staff_members staff
                   where staff.account_id = ${account?.id ?? null}
                     and staff.role in ('admin', 'reviewer'))
      )
  `;
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.content), {
    headers: {
      "Content-Type": image.mime_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
