import { getDb } from "./db";
import { randomUUID } from "node:crypto";
import { BookingError } from "./partner-bookings";
import {
  createOmiseCharge,
  getOmiseCharge,
  isOmiseId,
  omiseMode,
  OmiseApiError,
  type OmiseCharge,
} from "./omise";

type PaymentAttempt = {
  id: string;
  booking_id: string;
  amount_satang: string;
  status: string;
  provider_reference: string | null;
};

function validateCharge(charge: OmiseCharge, attempt: PaymentAttempt) {
  if (
    charge.livemode !== (omiseMode() === "live") ||
    charge.currency.toUpperCase() !== "THB" ||
    charge.amount !== Number(attempt.amount_satang) ||
    charge.ref_id !== attempt.id
  )
    throw new Error("Omise charge does not match payment attempt");
}

export async function applyOmiseCharge(
  attemptId: string,
  charge: OmiseCharge,
  eventId?: string,
) {
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [attempt] = await tx<PaymentAttempt[]>`
      select id, booking_id, amount_satang::text, status, provider_reference
      from rbc_go.payment_attempts where id = ${attemptId} and provider = 'omise' for update
    `;
    if (!attempt) throw new BookingError("payment_not_found");
    validateCharge(charge, attempt);
    if (eventId) {
      const inserted =
        await tx`insert into rbc_go.payment_events(provider,provider_event_id,payment_attempt_id,payload,processed_at)
        values('omise',${eventId},${attempt.id},${tx.json({ charge_id: charge.id, status: charge.status })},now())
        on conflict do nothing returning provider_event_id`;
      if (!inserted.length) return;
    }
    if (attempt.status === "refunded") return;
    if (attempt.status === "succeeded" && charge.status !== "successful")
      throw new Error(
        "A successful payment cannot be reversed by a stale event",
      );
    if (attempt.provider_reference && attempt.provider_reference !== charge.id)
      throw new Error("Omise charge reference changed");
    const status =
      charge.status === "successful"
        ? "succeeded"
        : charge.status === "pending"
          ? "pending"
          : "failed";
    await tx`update rbc_go.payment_attempts set provider_reference = ${charge.id},
      status = ${status}, updated_at = now() where id = ${attempt.id}`;
    if (status === "succeeded") {
      await tx`update rbc_go.bookings set status = 'confirmed', hold_expires_at = null,
        updated_at = now() where id = ${attempt.booking_id} and status = 'held'`;
    }
  });
}

export async function payPartnerBooking(
  accountId: string,
  bookingId: string,
  token: string,
  baseUrl: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId))
    throw new BookingError("invalid_booking");
  if (!isOmiseId("tokn", token))
    throw new BookingError("invalid_payment_token");
  const sql = getDb();
  const attempt = await sql.begin(async (tx) => {
    if (omiseMode() === "live") {
      const [verified] =
        await tx`select id from rbc_go.accounts where id=${accountId} and (email_verified_at is not null or phone_verified_at is not null)`;
      if (!verified) throw new BookingError("verification_required");
    }
    const [booking] = await tx<
      {
        id: string;
        total_satang: string;
        status: string;
        hold_expires_at: Date;
      }[]
    >`
      select id, total_satang::text, status, hold_expires_at
      from rbc_go.bookings where id = ${bookingId} and customer_account_id = ${accountId}
      for update
    `;
    if (!booking || booking.status !== "held")
      throw new BookingError("booking_locked");
    if (booking.hold_expires_at.getTime() <= Date.now())
      throw new BookingError("quote_expired");
    const [existing] = await tx<{ id: string }[]>`
      select id from rbc_go.payment_attempts where booking_id = ${bookingId}
        and status in ('created', 'pending', 'succeeded') limit 1
    `;
    if (existing) throw new BookingError("payment_in_progress");
    const [created] = await tx<{ id: string }[]>`
      insert into rbc_go.payment_attempts
        (booking_id, provider, idempotency_key, amount_satang, currency, status)
      values (${bookingId}, 'omise', ${randomUUID()}, ${booking.total_satang}, 'THB', 'created')
      returning id
    `;
    return { id: created.id, amount: Number(booking.total_satang) };
  });
  let charge: OmiseCharge;
  try {
    charge = await createOmiseCharge({
      token,
      amountSatang: attempt.amount,
      attemptId: attempt.id,
      bookingId,
      returnUri: `${baseUrl}/api/omise/return?bookingId=${bookingId}`,
    });
  } catch (error) {
    if (
      error instanceof OmiseApiError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      await sql`update rbc_go.payment_attempts set status = 'failed', updated_at = now()
        where id = ${attempt.id} and status = 'created'`;
    }
    throw error;
  }
  await applyOmiseCharge(attempt.id, charge);
  return charge.authorize_uri && charge.status === "pending"
    ? charge.authorize_uri
    : null;
}

export async function refreshBookingPayment(
  accountId: string,
  bookingId: string,
) {
  const sql = getDb();
  const [attempt] = await sql<PaymentAttempt[]>`
    select attempts.id, attempts.booking_id, attempts.amount_satang::text,
      attempts.status, attempts.provider_reference
    from rbc_go.payment_attempts attempts join rbc_go.bookings bookings on bookings.id = attempts.booking_id
    where attempts.booking_id = ${bookingId} and bookings.customer_account_id = ${accountId}
      and attempts.provider = 'omise' and attempts.status = 'pending'
    order by attempts.created_at desc limit 1
  `;
  if (!attempt?.provider_reference) return;
  await applyOmiseCharge(
    attempt.id,
    await getOmiseCharge(attempt.provider_reference),
  );
}

export async function applyOmiseWebhookCharge(
  chargeId: string,
  eventId?: string,
) {
  const charge = await getOmiseCharge(chargeId);
  const sql = getDb();
  const [attempt] = await sql<PaymentAttempt[]>`
    select id, booking_id, amount_satang::text, status, provider_reference
    from rbc_go.payment_attempts where provider = 'omise'
      and (provider_reference = ${chargeId} or id::text = ${charge.ref_id ?? ""})
  `;
  if (!attempt) return;
  await applyOmiseCharge(attempt.id, charge, eventId);
}
