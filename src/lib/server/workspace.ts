import { getDb } from "./db";
import { BookingError, parseBangkokDateTime } from "./partner-bookings";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validId(value: string) {
  if (!uuid.test(value)) throw new BookingError("invalid_request");
}

export async function bookingAccess(accountId: string, bookingId: string) {
  validId(bookingId);
  const sql = getDb();
  const [row] = await sql<
    {
      id: string;
      customer_account_id: string;
      listing_id: string;
      status: string;
      title: string;
      can_manage: boolean;
      handed_over_at: Date | null;
      ends_at: Date;
    }[]
  >`
    select bookings.id, bookings.customer_account_id, bookings.listing_id, bookings.status,
      bookings.handed_over_at, bookings.ends_at, listings.title,
      exists(select 1 from rbc_go.partner_members members join rbc_go.partners partners on partners.id = members.partner_id
        where members.partner_id = listings.partner_id and members.account_id = ${accountId}
        and members.role in ('owner','editor') and partners.status = 'active') as can_manage
    from rbc_go.bookings bookings join rbc_go.listings listings on listings.id = bookings.listing_id
    where bookings.id = ${bookingId} and (bookings.customer_account_id = ${accountId}
      or exists(select 1 from rbc_go.partner_members members where members.partner_id = listings.partner_id and members.account_id = ${accountId})
      or exists(select 1 from rbc_go.staff_members where account_id = ${accountId}))
  `;
  if (!row) throw new BookingError("booking_not_found");
  return row;
}

export async function saveListing(
  accountId: string,
  listingId: string,
  saved: boolean,
) {
  validId(listingId);
  const sql = getDb();
  if (!saved) {
    await sql`delete from rbc_go.saved_listings where account_id = ${accountId} and listing_id = ${listingId}`;
    return;
  }
  const rows = await sql`
    insert into rbc_go.saved_listings(account_id, listing_id)
    select ${accountId}, listings.id from rbc_go.listings listings join rbc_go.partners partners on partners.id = listings.partner_id
    where listings.id = ${listingId} and listings.status = 'approved' and partners.status = 'active'
    on conflict do nothing returning listing_id
  `;
  if (!rows.length) {
    const [existing] =
      await sql`select listing_id from rbc_go.saved_listings where account_id = ${accountId} and listing_id = ${listingId}`;
    if (!existing) throw new BookingError("listing_unavailable");
  }
}

export async function isListingSaved(accountId: string, listingId: string) {
  const sql = getDb();
  const [row] =
    await sql`select listing_id from rbc_go.saved_listings where account_id = ${accountId} and listing_id = ${listingId}`;
  return Boolean(row);
}

export async function listSavedListings(accountId: string) {
  const sql = getDb();
  return sql<{ id: string; title: string; location_text: string }[]>`
    select listings.id, listings.title, listings.location_text from rbc_go.saved_listings saved
    join rbc_go.listings listings on listings.id = saved.listing_id
    join rbc_go.partners partners on partners.id = listings.partner_id
    where saved.account_id = ${accountId} and listings.status = 'approved' and partners.status = 'active'
    order by saved.created_at desc limit 100
  `;
}

export async function listCustomerPayments(accountId: string) {
  const sql = getDb();
  return sql<
    {
      id: string;
      booking_id: string;
      title: string;
      amount_satang: string;
      status: string;
      created_at: Date;
    }[]
  >`
    select attempts.id, attempts.booking_id, listings.title, attempts.amount_satang::text, attempts.status, attempts.created_at
    from rbc_go.payment_attempts attempts join rbc_go.bookings bookings on bookings.id = attempts.booking_id
    join rbc_go.listings listings on listings.id = bookings.listing_id
    where bookings.customer_account_id = ${accountId} order by attempts.created_at desc limit 100
  `;
}

export async function listBookingMessages(
  accountId: string,
  bookingId: string,
) {
  await bookingAccess(accountId, bookingId);
  const sql = getDb();
  return sql<
    {
      id: string;
      body: string;
      display_name: string;
      sender_account_id: string;
      created_at: Date;
    }[]
  >`
    select messages.id, messages.body, messages.sender_account_id, accounts.display_name, messages.created_at
    from rbc_go.booking_messages messages join rbc_go.accounts accounts on accounts.id = messages.sender_account_id
    where messages.booking_id = ${bookingId} order by messages.created_at desc limit 100
  `;
}

export async function sendBookingMessage(
  accountId: string,
  bookingId: string,
  body: string,
) {
  await bookingAccess(accountId, bookingId);
  body = body.trim();
  if (!body || body.length > 5000) throw new BookingError("invalid_message");
  const sql = getDb();
  await sql.begin(async (tx) => {
    await tx`select id from rbc_go.bookings where id = ${bookingId} for update`;
    const [recent] = await tx<
      { count: number }[]
    >`select count(*)::integer as count from rbc_go.booking_messages
      where sender_account_id = ${accountId} and booking_id = ${bookingId} and created_at > now() - interval '1 minute'`;
    if (recent.count >= 10) throw new BookingError("too_many_attempts");
    const [message] = await tx<
      { id: string }[]
    >`insert into rbc_go.booking_messages(booking_id, sender_account_id, body)
      values(${bookingId}, ${accountId}, ${body}) returning id`;
    await tx`insert into rbc_go.email_outbox(booking_id, dedupe_key, recipient, subject, body, relative_path)
      select ${bookingId}, ${message.id} || ':' || accounts.id::text, accounts.email, 'RBC GO: New booking message',
        'You have a new booking message. Sign in to read and reply.', '/th/messages/' || ${bookingId}
      from rbc_go.accounts accounts where accounts.id <> ${accountId} and accounts.email is not null
      and (accounts.id = (select customer_account_id from rbc_go.bookings where id = ${bookingId})
        or accounts.id in (select members.account_id from rbc_go.partner_members members
          join rbc_go.listings listings on listings.partner_id = members.partner_id
          join rbc_go.bookings bookings on bookings.listing_id = listings.id where bookings.id = ${bookingId}))
      on conflict(dedupe_key) do nothing`;
  });
}

export async function submitBookingReview(
  accountId: string,
  bookingId: string,
  rating: number,
  body: string,
) {
  validId(bookingId);
  body = body.trim();
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    !body ||
    body.length > 2000
  )
    throw new BookingError("invalid_review");
  const sql = getDb();
  const rows =
    await sql`insert into rbc_go.booking_reviews(booking_id, author_account_id, rating, body)
    select id, ${accountId}, ${rating}, ${body} from rbc_go.bookings
    where id = ${bookingId} and customer_account_id = ${accountId} and status = 'completed'
    on conflict(booking_id) do nothing returning id`;
  if (!rows.length) throw new BookingError("review_unavailable");
}

export async function listCustomerReviews(accountId: string) {
  const sql = getDb();
  return sql<
    { booking_id: string; title: string; rating: number; body: string }[]
  >`
    select reviews.booking_id, listings.title, reviews.rating, reviews.body from rbc_go.booking_reviews reviews
    join rbc_go.bookings bookings on bookings.id = reviews.booking_id join rbc_go.listings listings on listings.id = bookings.listing_id
    where reviews.author_account_id = ${accountId} order by reviews.created_at desc limit 100`;
}

export async function addAvailabilityBlock(
  accountId: string,
  listingId: string,
  starts: string,
  ends: string,
  reason: string,
) {
  validId(listingId);
  const start = parseBangkokDateTime(starts),
    end = parseBangkokDateTime(ends);
  if (start >= end || end.getTime() <= Date.now() || reason.length > 300)
    throw new BookingError("invalid_dates");
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [listing] = await tx`select listings.id from rbc_go.listings listings
      join rbc_go.partner_members members on members.partner_id = listings.partner_id
      join rbc_go.partners partners on partners.id = listings.partner_id
      where listings.id = ${listingId} and members.account_id = ${accountId} and members.role in ('owner','editor')
      and partners.status = 'active' for update of listings`;
    if (!listing) throw new BookingError("listing_unavailable");
    const [conflict] =
      await tx`select id from rbc_go.bookings where listing_id = ${listingId} and status in ('held','confirmed')
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(${start},${end},'[)') limit 1`;
    if (conflict) throw new BookingError("dates_unavailable");
    await tx`insert into rbc_go.availability_blocks(listing_id, starts_at, ends_at, reason) values(${listingId},${start},${end},${reason.trim()})`;
  });
}

export async function removeAvailabilityBlock(
  accountId: string,
  blockId: string,
) {
  validId(blockId);
  const sql = getDb();
  const rows =
    await sql`delete from rbc_go.availability_blocks blocks using rbc_go.listings listings,
    rbc_go.partner_members members, rbc_go.partners partners
    where blocks.id = ${blockId} and listings.id = blocks.listing_id and members.partner_id = listings.partner_id
      and partners.id = listings.partner_id and partners.status = 'active' and members.account_id = ${accountId}
      and members.role in ('owner','editor') returning blocks.id`;
  if (!rows.length) throw new BookingError("listing_unavailable");
}

export async function listAvailabilityBlocks(accountId: string) {
  const sql = getDb();
  return sql<
    {
      id: string;
      title: string;
      starts_at: Date;
      ends_at: Date;
      reason: string;
    }[]
  >`
    select blocks.id, listings.title, blocks.starts_at, blocks.ends_at, blocks.reason from rbc_go.availability_blocks blocks
    join rbc_go.listings listings on listings.id = blocks.listing_id join rbc_go.partner_members members on members.partner_id = listings.partner_id
    where members.account_id = ${accountId} order by blocks.starts_at desc limit 100`;
}

export async function progressBooking(
  accountId: string,
  bookingId: string,
  complete: boolean,
) {
  validId(bookingId);
  const sql = getDb();
  const rows = complete
    ? await sql`update rbc_go.bookings bookings set status = 'completed', completed_at = now(), updated_at = now()
      from rbc_go.listings listings, rbc_go.partner_members members, rbc_go.partners partners
      where bookings.id = ${bookingId} and listings.id = bookings.listing_id and members.partner_id = listings.partner_id
      and partners.id = listings.partner_id and partners.status = 'active' and members.account_id = ${accountId}
      and members.role in ('owner','editor') and bookings.status = 'confirmed' and bookings.handed_over_at is not null and bookings.ends_at <= now()
      returning bookings.id`
    : await sql`update rbc_go.bookings bookings set handed_over_at = now(), updated_at = now()
      from rbc_go.listings listings, rbc_go.partner_members members, rbc_go.partners partners
      where bookings.id = ${bookingId} and listings.id = bookings.listing_id and members.partner_id = listings.partner_id
      and partners.id = listings.partner_id and partners.status = 'active' and members.account_id = ${accountId}
      and members.role in ('owner','editor') and bookings.status = 'confirmed' and bookings.handed_over_at is null and bookings.starts_at <= now()
      returning bookings.id`;
  if (!rows.length) throw new BookingError("booking_locked");
}
