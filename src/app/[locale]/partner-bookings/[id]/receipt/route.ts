import { currentAccount } from "@/lib/server/auth";
import { getCustomerPartnerBooking } from "@/lib/server/partner-bookings";
import { getDb } from "@/lib/server/db";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await currentAccount();
  if (!account) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const booking = await getCustomerPartnerBooking(account.id, id);
  if (!booking) return new Response("Not found", { status: 404 });
  const sql = getDb();
  const [payment] = await sql<
    { provider_reference: string; amount_satang: string; updated_at: Date }[]
  >`
    select provider_reference,amount_satang::text,updated_at from rbc_go.payment_attempts where booking_id=${id} and status in ('succeeded','refunded') order by created_at desc limit 1`;
  if (!payment)
    return new Response("Payment has not been confirmed", { status: 409 });
  const text = [
    "RBC GO — Payment receipt",
    `Booking: ${id}`,
    `Vehicle: ${booking.title}`,
    `Provider: ${booking.business_name}`,
    `Traveler: ${booking.traveler_snapshot.name}`,
    `Paid: THB ${(Number(payment.amount_satang) / 100).toFixed(2)}`,
    `Gateway reference: ${payment.provider_reference}`,
    `Recorded: ${payment.updated_at.toISOString()}`,
    "This payment receipt is not a tax invoice.",
  ].join("\n");
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="rbc-go-${id}.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
}
