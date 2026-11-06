import { getDb } from "./db";
import { BookingError } from "./partner-bookings";
import { splitRental } from "../finance";
import {
  createOmiseRefund,
  getOmiseRefund,
  getOmiseRecipient,
  createOmiseTransfer,
  getOmiseTransfer,
  omiseMode,
  omiseConfigured,
  OmiseApiError,
  type OmiseRefund,
  type OmiseTransfer,
} from "./omise";

const uuid = /^[0-9a-f-]{36}$/i;
function validId(id: string) {
  if (!uuid.test(id)) throw new BookingError("invalid_request");
}
export async function requireStaff(accountId: string, adminOnly = false) {
  const sql = getDb();
  const [staff] = await sql<
    { role: string }[]
  >`select role from rbc_go.staff_members where account_id = ${accountId}`;
  if (!staff || (adminOnly && staff.role !== "admin"))
    throw new BookingError("access_denied");
  return staff;
}

export async function requestBookingRefund(
  accountId: string,
  bookingId: string,
  kind: string,
  reason: string,
) {
  validId(bookingId);
  reason = reason.trim();
  if (
    !["cancellation", "deposit"].includes(kind) ||
    !reason ||
    reason.length > 1000
  )
    throw new BookingError("invalid_request");
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [booking] =
      await tx`select id from rbc_go.bookings where id = ${bookingId} and customer_account_id = ${accountId}
      and (status = 'confirmed' and ${kind} = 'cancellation' or status = 'completed' and ${kind} = 'deposit') for update`;
    if (!booking) throw new BookingError("booking_locked");
    const [payout] =
      await tx`select id from rbc_go.payouts where booking_id = ${bookingId}
        union all select id from rbc_go.partner_withdrawal_requests where booking_id=${bookingId}`;
    if (payout) throw new BookingError("settlement_locked");
    const [payment] = await tx<
      { id: string }[]
    >`select id from rbc_go.payment_attempts where booking_id = ${bookingId} and status = 'succeeded' order by created_at desc limit 1`;
    if (!payment) throw new BookingError("payment_not_found");
    const inserted =
      await tx`insert into rbc_go.refund_requests(booking_id,payment_attempt_id,kind,reason)
      values(${bookingId},${payment.id},${kind},${reason}) on conflict do nothing returning id`;
    if (!inserted.length) throw new BookingError("refund_in_progress");
  });
}

export async function applyRefund(refundId: string, refund: OmiseRefund) {
  validId(refundId);
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [row] = await tx<
      {
        id: string;
        booking_id: string;
        payment_attempt_id: string;
        amount_satang: string;
        kind: string;
        provider_reference: string | null;
        charge_id: string;
      }[]
    >`
      select refunds.id,refunds.booking_id,refunds.payment_attempt_id,refunds.amount_satang::text,refunds.kind,refunds.provider_reference,attempts.provider_reference as charge_id
      from rbc_go.refund_requests refunds join rbc_go.payment_attempts attempts on attempts.id = refunds.payment_attempt_id
      where refunds.id = ${refundId} and refunds.status in ('processing','succeeded') for update of refunds`;
    if (
      !row ||
      refund.amount !== Number(row.amount_satang) ||
      refund.charge !== row.charge_id ||
      refund.currency.toUpperCase() !== "THB" ||
      refund.livemode !== (omiseMode() === "live") ||
      refund.metadata?.refund_id !== row.id ||
      (row.provider_reference && row.provider_reference !== refund.id)
    )
      throw new BookingError("provider_mismatch");
    if (refund.status !== "closed") {
      await tx`update rbc_go.refund_requests set provider_reference=${refund.id},updated_at=now() where id=${row.id}`;
      return;
    }
    await tx`update rbc_go.refund_requests set status='succeeded',provider_reference=${refund.id},updated_at=now() where id=${row.id}`;
    if (row.kind === "cancellation")
      await tx`update rbc_go.bookings set status='cancelled',updated_at=now() where id=${row.booking_id} and status='confirmed'`;
    await tx`update rbc_go.payment_attempts attempts set status='refunded',updated_at=now() where id=${row.payment_attempt_id}
      and amount_satang=(select coalesce(sum(amount_satang),0) from rbc_go.refund_requests where payment_attempt_id=attempts.id and status='succeeded')`;
  });
}

export async function approveRefund(
  accountId: string,
  refundId: string,
  amountBaht: string,
) {
  await requireStaff(accountId, true);
  if (!omiseConfigured()) throw new BookingError("payment_service_unavailable");
  validId(refundId);
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(amountBaht))
    throw new BookingError("invalid_price");
  const [whole, fraction = ""] = amountBaht.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  const sql = getDb();
  const row = await sql.begin(async (tx) => {
    const [refund] = await tx<
      {
        id: string;
        booking_id: string;
        payment_attempt_id: string;
        reason: string;
        kind: string;
      }[]
    >`select id,booking_id,payment_attempt_id,reason,kind from rbc_go.refund_requests where id=${refundId} and status in ('requested','failed') for update`;
    if (!refund) throw new BookingError("refund_in_progress");
    const [booking] = await tx<
      { deposit_satang: string }[]
    >`select deposit_satang::text from rbc_go.bookings where id=${refund.booking_id} for update`;
    const [payout] =
      await tx`select id from rbc_go.payouts where booking_id=${refund.booking_id}`;
    if (payout) throw new BookingError("settlement_locked");
    const [payment] = await tx<
      { amount_satang: string; provider_reference: string }[]
    >`select amount_satang::text,provider_reference from rbc_go.payment_attempts where id=${refund.payment_attempt_id} and status='succeeded' for update`;
    const [refunded] = await tx<
      { amount: string; deposit: string }[]
    >`select coalesce(sum(amount_satang),0)::text as amount,
      coalesce(sum(amount_satang) filter(where kind='deposit'),0)::text as deposit
      from rbc_go.refund_requests where payment_attempt_id=${refund.payment_attempt_id} and status='succeeded'`;
    if (
      !payment ||
      !payment.provider_reference ||
      amount <= 0 ||
      amount > Number(payment.amount_satang) - Number(refunded.amount) ||
      (refund.kind === "deposit" &&
        amount > Number(booking.deposit_satang) - Number(refunded.deposit))
    )
      throw new BookingError("invalid_price");
    await tx`update rbc_go.refund_requests set status='processing',amount_satang=${amount},reviewed_by=${accountId},updated_at=now() where id=${refundId}`;
    return { ...refund, chargeId: payment.provider_reference };
  });
  try {
    await applyRefund(
      refundId,
      await createOmiseRefund(row.chargeId, amount, refundId, row.reason),
    );
  } catch (error) {
    // An uncertain network response must be reconciled, never retried blindly.
    if (
      error instanceof OmiseApiError &&
      error.status >= 400 &&
      error.status < 500
    )
      await sql`update rbc_go.refund_requests set status='failed',updated_at=now() where id=${refundId} and status='processing'`;
    throw error;
  }
}

export async function declineRefund(accountId: string, refundId: string) {
  await requireStaff(accountId, true);
  validId(refundId);
  const sql = getDb();
  const rows =
    await sql`update rbc_go.refund_requests set status='declined',reviewed_by=${accountId},updated_at=now() where id=${refundId} and status='requested' returning id`;
  if (!rows.length) throw new BookingError("refund_in_progress");
}

export async function reconcileRefund(
  accountId: string,
  refundId: string,
  providerId: string,
) {
  await requireStaff(accountId, true);
  validId(refundId);
  const sql = getDb();
  const [row] = await sql<
    { charge_id: string }[]
  >`select attempts.provider_reference as charge_id from rbc_go.refund_requests refunds
    join rbc_go.payment_attempts attempts on attempts.id=refunds.payment_attempt_id where refunds.id=${refundId}`;
  if (!row) throw new BookingError("payment_not_found");
  await applyRefund(refundId, await getOmiseRefund(row.charge_id, providerId));
}

export async function registerPayoutRecipient(
  accountId: string,
  partnerId: string,
  recipientId: string,
) {
  await requireStaff(accountId, true);
  validId(partnerId);
  const recipient = await getOmiseRecipient(recipientId);
  if (
    !recipient.active ||
    !recipient.verified ||
    recipient.livemode !== (omiseMode() === "live")
  )
    throw new BookingError("recipient_unverified");
  const sql = getDb();
  const rows =
    await sql`insert into rbc_go.partner_payout_accounts(partner_id,recipient_id,livemode,verified_by)
    select id,${recipientId},${recipient.livemode},${accountId} from rbc_go.partners where id=${partnerId} and status='active'
    on conflict(partner_id) do update set recipient_id=excluded.recipient_id,livemode=excluded.livemode,verified_by=excluded.verified_by,verified_at=now() returning partner_id`;
  if (!rows.length) throw new BookingError("listing_unavailable");
}

export async function applyPayout(payoutId: string, transfer: OmiseTransfer) {
  validId(payoutId);
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [row] = await tx<
      {
        amount_satang: string;
        recipient_id: string;
        provider_reference: string | null;
        status: string;
      }[]
    >`select amount_satang::text,recipient_id,provider_reference,status from rbc_go.payouts where id=${payoutId} for update`;
    if (
      !row ||
      transfer.amount !== Number(row.amount_satang) ||
      transfer.recipient !== row.recipient_id ||
      transfer.currency.toUpperCase() !== "THB" ||
      transfer.livemode !== (omiseMode() === "live") ||
      transfer.metadata?.payout_id !== payoutId ||
      (row.provider_reference && row.provider_reference !== transfer.id)
    )
      throw new BookingError("provider_mismatch");
    if (row.status === "paid") return;
    await tx`update rbc_go.payouts set provider_reference=${transfer.id},status=${transfer.paid ? "paid" : transfer.failure_code ? "failed" : "pending"},fee_satang=${transfer.total_fee ?? null},net_satang=${transfer.net ?? null},updated_at=now() where id=${payoutId}`;
  });
}

export async function payOutBooking(accountId: string, bookingId: string) {
  await requireStaff(accountId, true);
  if (!omiseConfigured()) throw new BookingError("payment_service_unavailable");
  validId(bookingId);
  const sql = getDb();
  const row = await sql.begin(async (tx) => {
    const [booking] = await tx<
      {
        partner_id: string;
        total_satang: string;
        deposit_satang: string;
        commission_bps: number;
      }[]
    >`select listings.partner_id,bookings.total_satang::text,bookings.deposit_satang::text,bookings.commission_bps
      from rbc_go.bookings bookings join rbc_go.listings listings on listings.id=bookings.listing_id join rbc_go.partners partners on partners.id=listings.partner_id
      where bookings.id=${bookingId} and bookings.status='completed' and partners.status='active' for update of bookings`;
    if (!booking) throw new BookingError("booking_locked");
    const [pending] =
      await tx`select id from rbc_go.refund_requests where booking_id=${bookingId} and status in ('requested','processing')`;
    if (pending) throw new BookingError("refund_in_progress");
    const [payment] =
      await tx`select id from rbc_go.payment_attempts where booking_id=${bookingId} and status='succeeded' and livemode=${omiseMode() === "live"}`;
    if (!payment) throw new BookingError("payment_not_found");
    const [refunds] = await tx<
      { amount: string; deposit: string }[]
    >`select coalesce(sum(amount_satang),0)::text as amount,
      coalesce(sum(amount_satang) filter(where kind='deposit'),0)::text as deposit from rbc_go.refund_requests where booking_id=${bookingId} and status='succeeded'`;
    if (Number(refunds.deposit) < Number(booking.deposit_satang))
      throw new BookingError("deposit_unsettled");
    const [recipient] = await tx<
      { recipient_id: string; livemode: boolean }[]
    >`select recipient_id,livemode from rbc_go.partner_payout_accounts where partner_id=${booking.partner_id}`;
    if (!recipient || recipient.livemode !== (omiseMode() === "live"))
      throw new BookingError("recipient_unverified");
    const rental =
      Number(booking.total_satang) -
      Number(booking.deposit_satang) -
      Math.max(0, Number(refunds.amount) - Number(refunds.deposit));
    const bps = booking.commission_bps;
    const amount = splitRental(Math.max(0, rental), bps).partner;
    if (amount <= 0) throw new BookingError("invalid_price");
    const [withdrawal] = await tx<
      { amount_satang: string }[]
    >`select amount_satang::text from rbc_go.partner_withdrawal_requests where booking_id=${bookingId}`;
    if (withdrawal && Number(withdrawal.amount_satang) !== amount)
      throw new BookingError("settlement_locked");
    const [payout] = await tx<
      { id: string }[]
    >`insert into rbc_go.payouts(booking_id,partner_id,recipient_id,amount_satang,commission_bps,initiated_by)
      values(${bookingId},${booking.partner_id},${recipient.recipient_id},${amount},${bps},${accountId})
      on conflict(booking_id) do update set status='processing',amount_satang=excluded.amount_satang,
      commission_bps=excluded.commission_bps,recipient_id=excluded.recipient_id,initiated_by=excluded.initiated_by,updated_at=now()
      where payouts.status='failed' and payouts.provider_reference is null returning id`;
    if (!payout) throw new BookingError("settlement_locked");
    return { id: payout.id, recipient: recipient.recipient_id, amount };
  });
  try {
    const recipient = await getOmiseRecipient(row.recipient);
    if (
      !recipient.verified ||
      !recipient.active ||
      recipient.livemode !== (omiseMode() === "live")
    )
      throw new BookingError("recipient_unverified");
    await applyPayout(
      row.id,
      await createOmiseTransfer(row.recipient, row.amount, row.id),
    );
  } catch (error) {
    if (
      (error instanceof BookingError &&
        error.code === "recipient_unverified") ||
      (error instanceof OmiseApiError &&
        error.status >= 400 &&
        error.status < 500)
    )
      await sql`update rbc_go.payouts set status='failed',updated_at=now() where id=${row.id} and provider_reference is null and status='processing'`;
    throw error;
  }
}

export async function reconcilePayout(
  accountId: string,
  payoutId: string,
  providerId: string,
) {
  await requireStaff(accountId, true);
  await applyPayout(payoutId, await getOmiseTransfer(providerId));
}

export async function applyOmiseWebhookTransfer(providerId: string) {
  const transfer = await getOmiseTransfer(providerId);
  const payoutId = transfer.metadata?.payout_id;
  if (!payoutId || !uuid.test(payoutId)) return;
  const [payout] =
    await getDb()`select id from rbc_go.payouts where id=${payoutId}`;
  if (payout) await applyPayout(payoutId, transfer);
}

export async function listCustomerRefunds(
  accountId: string,
  bookingId: string,
) {
  const sql = getDb();
  return sql<
    {
      id: string;
      kind: string;
      status: string;
      amount_satang: string | null;
      reason: string;
    }[]
  >`
    select refunds.id,refunds.kind,refunds.status,refunds.amount_satang::text,refunds.reason from rbc_go.refund_requests refunds
    join rbc_go.bookings bookings on bookings.id=refunds.booking_id where bookings.id=${bookingId} and bookings.customer_account_id=${accountId}
    order by refunds.created_at desc`;
}

export async function listSettlementWorkspace(accountId: string) {
  await requireStaff(accountId);
  const sql = getDb();
  const [bookings, refunds, payouts, partners] = await Promise.all([
    sql<
      {
        id: string;
        title: string;
        status: string;
        total_satang: string;
        business_name: string;
        customer_name: string;
      }[]
    >`select bookings.id,listings.title,bookings.status,bookings.total_satang::text,partners.business_name,accounts.display_name as customer_name
      from rbc_go.bookings bookings join rbc_go.listings listings on listings.id=bookings.listing_id join rbc_go.partners partners on partners.id=listings.partner_id
      join rbc_go.accounts accounts on accounts.id=bookings.customer_account_id order by bookings.created_at desc limit 100`,
    sql<
      {
        id: string;
        booking_id: string;
        kind: string;
        reason: string;
        status: string;
        amount_satang: string | null;
      }[]
    >`select id,booking_id,kind,reason,status,amount_satang::text from rbc_go.refund_requests order by created_at desc limit 100`,
    sql<
      {
        id: string;
        booking_id: string;
        amount_satang: string;
        status: string;
        recipient_id: string;
        provider_reference: string | null;
      }[]
    >`select id,booking_id,amount_satang::text,status,recipient_id,provider_reference from rbc_go.payouts order by created_at desc limit 100`,
    sql<
      { id: string; business_name: string; recipient_id: string | null }[]
    >`select partners.id,partners.business_name,accounts.recipient_id from rbc_go.partners partners
      left join rbc_go.partner_payout_accounts accounts on accounts.partner_id=partners.id where partners.status='active' order by partners.created_at desc limit 100`,
  ]);
  return { bookings, refunds, payouts, partners };
}
