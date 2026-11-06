import { getDb } from "./db";
import {
  getOmiseCharge,
  getOmiseRefund,
  getOmiseTransfer,
  omiseConfigured,
} from "./omise";
import { applyOmiseCharge } from "./booking-payments";
import { applyRefund, applyPayout } from "./settlements";

export async function reconcilePayments() {
  if (!omiseConfigured()) throw new Error("payment_service_unavailable");
  const sql = getDb();
  let reconciled = 0,
    failed = 0;
  const payments = await sql<
    { id: string; provider_reference: string }[]
  >`select id,provider_reference from rbc_go.payment_attempts
    where provider='omise' and status='pending' and provider_reference is not null order by updated_at limit 50`;
  for (const row of payments)
    try {
      await applyOmiseCharge(
        row.id,
        await getOmiseCharge(row.provider_reference),
      );
      reconciled++;
    } catch {
      failed++;
    }
  const refunds = await sql<
    { id: string; provider_reference: string; charge_id: string }[]
  >`select refunds.id,refunds.provider_reference,attempts.provider_reference as charge_id
    from rbc_go.refund_requests refunds join rbc_go.payment_attempts attempts on attempts.id=refunds.payment_attempt_id
    where refunds.status='processing' and refunds.provider_reference is not null order by refunds.updated_at limit 50`;
  for (const row of refunds)
    try {
      await applyRefund(
        row.id,
        await getOmiseRefund(row.charge_id, row.provider_reference),
      );
      reconciled++;
    } catch {
      failed++;
    }
  const payouts = await sql<
    { id: string; provider_reference: string }[]
  >`select id,provider_reference from rbc_go.payouts
    where status='pending' and provider_reference is not null order by updated_at limit 50`;
  for (const row of payouts)
    try {
      await applyPayout(row.id, await getOmiseTransfer(row.provider_reference));
      reconciled++;
    } catch {
      failed++;
    }
  await sql`update rbc_go.bookings bookings set status='expired',updated_at=now() where status='held' and hold_expires_at<=now()
    and not exists(select 1 from rbc_go.payment_attempts attempts where attempts.booking_id=bookings.id and attempts.status in ('created','pending','succeeded'))`;
  return { reconciled, failed };
}
