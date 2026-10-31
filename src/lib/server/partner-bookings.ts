import { randomUUID } from "node:crypto";
import { getDb } from "./db";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BookingError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export type PartnerBooking = {
  id: string;
  listing_id: string;
  title: string;
  business_name: string;
  starts_at: Date;
  ends_at: Date;
  status: string;
  total_satang: string;
  deposit_satang: string;
  hold_expires_at: Date | null;
  traveler_snapshot: {
    name: string;
    email: string;
    phone: string;
    note: string;
    guests: number;
  };
  created_at: Date;
};

function parseBangkokDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new BookingError("invalid_dates");
  const date = new Date(`${value}:00+07:00`);
  if (
    Number.isNaN(date.getTime()) ||
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(date)
      .replace(" ", "T") !== value
  )
    throw new BookingError("invalid_dates");
  return date;
}

export async function requestPartnerBooking(
  accountId: string,
  input: {
    listingId: string;
    startsAt: string;
    endsAt: string;
    name: string;
    email: string;
    phone: string;
    note: string;
    guests: string;
  },
) {
  if (!uuid.test(input.listingId)) throw new BookingError("invalid_listing");
  const startsAt = parseBangkokDateTime(input.startsAt);
  const endsAt = parseBangkokDateTime(input.endsAt);
  const now = Date.now();
  if (
    startsAt.getTime() < now + 60 * 60 * 1000 ||
    endsAt.getTime() <= startsAt.getTime() ||
    endsAt.getTime() > now + 366 * 86400000 ||
    endsAt.getTime() - startsAt.getTime() > 31 * 86400000
  )
    throw new BookingError("invalid_dates");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const note = input.note.trim();
  const guests = Number(input.guests);
  if (
    name.length < 2 ||
    name.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    phone.length > 40 ||
    note.length > 1000 ||
    !Number.isInteger(guests) ||
    guests < 1
  )
    throw new BookingError("invalid_traveler");
  const sql = getDb();
  const [listing] = await sql<
    {
      id: string;
      capacity: number;
      base_price_satang: string;
      deposit_satang: string;
    }[]
  >`
    select listings.id, listings.capacity, listings.base_price_satang::text, listings.deposit_satang::text
    from rbc_go.listings listings join rbc_go.partners partners on partners.id = listings.partner_id
    where listings.id = ${input.listingId} and listings.status = 'approved' and partners.status = 'active'
  `;
  if (!listing) throw new BookingError("listing_unavailable");
  if (guests > listing.capacity) throw new BookingError("invalid_traveler");
  const [conflict] = await sql<{ id: string }[]>`
    select id from rbc_go.bookings where listing_id = ${listing.id}
      and status in ('held', 'confirmed')
      and (status <> 'held' or hold_expires_at > now())
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(${startsAt}, ${endsAt}, '[)')
    limit 1
  `;
  const [block] = await sql<{ id: string }[]>`
    select id from rbc_go.availability_blocks where listing_id = ${listing.id}
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(${startsAt}, ${endsAt}, '[)')
    limit 1
  `;
  if (conflict || block) throw new BookingError("dates_unavailable");
  const traveler = { name, email, phone, note, guests };
  const price = { base_price_satang: listing.base_price_satang, quoted: false };
  const [booking] = await sql<{ id: string }[]>`
    insert into rbc_go.bookings
      (customer_account_id, listing_id, starts_at, ends_at, status,
       total_satang, deposit_satang, price_snapshot, traveler_snapshot, idempotency_key)
    values (${accountId}, ${listing.id}, ${startsAt}, ${endsAt}, 'requested', 0,
      ${listing.deposit_satang}, ${sql.json(price)}, ${sql.json(traveler)}, ${randomUUID()})
    returning id
  `;
  return booking.id;
}

export async function listCustomerPartnerBookings(accountId: string) {
  const sql = getDb();
  return sql<PartnerBooking[]>`
    select bookings.id, bookings.listing_id, listings.title, partners.business_name,
      bookings.starts_at, bookings.ends_at, bookings.status, bookings.total_satang::text,
      bookings.deposit_satang::text, bookings.hold_expires_at, bookings.traveler_snapshot,
      bookings.created_at
    from rbc_go.bookings bookings join rbc_go.listings listings on listings.id = bookings.listing_id
    join rbc_go.partners partners on partners.id = listings.partner_id
    where bookings.customer_account_id = ${accountId}
    order by bookings.created_at desc limit 100
  `;
}

export async function getCustomerPartnerBooking(
  accountId: string,
  bookingId: string,
) {
  if (!uuid.test(bookingId)) return null;
  const sql = getDb();
  const [booking] = await sql<PartnerBooking[]>`
    select bookings.id, bookings.listing_id, listings.title, partners.business_name,
      bookings.starts_at, bookings.ends_at, bookings.status, bookings.total_satang::text,
      bookings.deposit_satang::text, bookings.hold_expires_at, bookings.traveler_snapshot,
      bookings.created_at
    from rbc_go.bookings bookings join rbc_go.listings listings on listings.id = bookings.listing_id
    join rbc_go.partners partners on partners.id = listings.partner_id
    where bookings.id = ${bookingId} and bookings.customer_account_id = ${accountId}
  `;
  return booking ?? null;
}

export async function getCustomerPaymentState(
  accountId: string,
  bookingId: string,
) {
  if (!uuid.test(bookingId)) return null;
  const sql = getDb();
  const [attempt] = await sql<{ status: string }[]>`
    select attempts.status from rbc_go.payment_attempts attempts
    join rbc_go.bookings bookings on bookings.id = attempts.booking_id
    where attempts.booking_id = ${bookingId} and bookings.customer_account_id = ${accountId}
      and attempts.provider = 'omise' and attempts.status in ('created', 'pending', 'succeeded')
    order by attempts.created_at desc limit 1
  `;
  return attempt?.status ?? null;
}

export async function listPartnerBookingRequests(accountId: string) {
  const sql = getDb();
  return sql<PartnerBooking[]>`
    select bookings.id, bookings.listing_id, listings.title, partners.business_name,
      bookings.starts_at, bookings.ends_at, bookings.status, bookings.total_satang::text,
      bookings.deposit_satang::text, bookings.hold_expires_at, bookings.traveler_snapshot,
      bookings.created_at
    from rbc_go.bookings bookings join rbc_go.listings listings on listings.id = bookings.listing_id
    join rbc_go.partners partners on partners.id = listings.partner_id
    join rbc_go.partner_members members on members.partner_id = partners.id
    where members.account_id = ${accountId}
    order by bookings.created_at desc limit 100
  `;
}

export async function decidePartnerBooking(
  accountId: string,
  bookingId: string,
  decision: "quote" | "decline",
  amountBaht: string,
) {
  if (!uuid.test(bookingId)) throw new BookingError("invalid_booking");
  let amount = 0;
  if (decision === "quote") {
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(amountBaht))
      throw new BookingError("invalid_price");
    const [baht, cents = ""] = amountBaht.split(".");
    amount = Number(baht) * 100 + Number(cents.padEnd(2, "0"));
    if (amount < 100) throw new BookingError("invalid_price");
  }
  const sql = getDb();
  try {
    await sql.begin(async (tx) => {
      const [booking] = await tx<
        {
          id: string;
          listing_id: string;
          starts_at: Date;
          ends_at: Date;
          base_price_satang: string;
          deposit_satang: string;
        }[]
      >`
      select bookings.id, bookings.listing_id, bookings.starts_at, bookings.ends_at,
        listings.base_price_satang::text, bookings.deposit_satang::text
      from rbc_go.bookings bookings join rbc_go.listings listings on listings.id = bookings.listing_id
      join rbc_go.partners partners on partners.id = listings.partner_id
      join rbc_go.partner_members members on members.partner_id = partners.id
      where bookings.id = ${bookingId} and members.account_id = ${accountId}
        and members.role in ('owner', 'editor') and partners.status = 'active'
        and bookings.status = 'requested' for update of bookings
    `;
      if (!booking) throw new BookingError("booking_locked");
      if (booking.starts_at.getTime() <= Date.now())
        throw new BookingError("dates_unavailable");
      if (decision === "decline") {
        await tx`update rbc_go.bookings set status = 'declined', updated_at = now() where id = ${booking.id}`;
        return;
      }
      await tx`update rbc_go.bookings set status = 'expired', updated_at = now()
      where listing_id = ${booking.listing_id} and status = 'held' and hold_expires_at <= now()
      and not exists (select 1 from rbc_go.payment_attempts attempts
        where attempts.booking_id = bookings.id and attempts.status in ('created', 'pending', 'succeeded'))`;
      const [conflict] = await tx<{ id: string }[]>`
      select id from rbc_go.bookings where listing_id = ${booking.listing_id}
        and status in ('held', 'confirmed')
        and tstzrange(starts_at, ends_at, '[)') && tstzrange(${booking.starts_at}, ${booking.ends_at}, '[)')
      limit 1
    `;
      const [block] = await tx<{ id: string }[]>`
      select id from rbc_go.availability_blocks where listing_id = ${booking.listing_id}
        and tstzrange(starts_at, ends_at, '[)') && tstzrange(${booking.starts_at}, ${booking.ends_at}, '[)')
      limit 1
    `;
      if (conflict || block) throw new BookingError("dates_unavailable");
      const deposit = Number(booking.deposit_satang);
      const total = amount + deposit;
      const price = {
        base_price_satang: booking.base_price_satang,
        quoted: true,
        rental_satang: amount,
        deposit_satang: deposit,
        total_satang: total,
      };
      await tx`update rbc_go.bookings set status = 'held', total_satang = ${total},
      price_snapshot = ${tx.json(price)}, hold_expires_at = now() + interval '48 hours',
      updated_at = now() where id = ${booking.id}`;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23P01"
    )
      throw new BookingError("dates_unavailable");
    throw error;
  }
}

export async function cancelPartnerBooking(
  accountId: string,
  bookingId: string,
) {
  if (!uuid.test(bookingId)) throw new BookingError("invalid_booking");
  const sql = getDb();
  const [booking] = await sql<{ id: string }[]>`
    update rbc_go.bookings set status = 'cancelled', updated_at = now()
    where id = ${bookingId} and customer_account_id = ${accountId}
      and status in ('requested', 'held')
      and not exists (select 1 from rbc_go.payment_attempts attempts
        where attempts.booking_id = bookings.id and attempts.status in ('created', 'pending', 'succeeded'))
    returning id
  `;
  if (!booking) throw new BookingError("booking_locked");
}
