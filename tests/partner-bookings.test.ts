import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import test from "node:test";

const url =
  process.env.RBC_GO_TEST_DATABASE_URL ??
  (process.env.RBC_GO_TEST_RUN_LOCAL === "1"
    ? process.env.DATABASE_URL
    : undefined);

test(
  "partner request, quote, payment reconciliation and access control",
  { skip: !url },
  async () => {
    const databaseName = new URL(url!).pathname;
    assert.match(
      databaseName,
      /(?:_test|_dev)$/,
      "Use only a local dev or test database",
    );
    process.env.DATABASE_URL = url;
    const { getDb } = await import("../src/lib/server/db");
    const {
      requestPartnerBooking,
      decidePartnerBooking,
      getCustomerPartnerBooking,
    } = await import("../src/lib/server/partner-bookings");
    const { applyOmiseCharge } =
      await import("../src/lib/server/booking-payments");
    const { verifyOmiseWebhook } = await import("../src/lib/server/omise");
    const sql = getDb();
    const unique = randomUUID();
    let ownerId = "",
      customerId = "",
      otherId = "";
    try {
      const [owner] = await sql<
        { id: string }[]
      >`insert into rbc_go.accounts (email, display_name)
      values (${`owner-${unique}@example.test`}, 'Owner') returning id`;
      ownerId = owner.id;
      const [customer] = await sql<
        { id: string }[]
      >`insert into rbc_go.accounts (email, display_name)
      values (${`customer-${unique}@example.test`}, 'Customer') returning id`;
      customerId = customer.id;
      const [other] = await sql<
        { id: string }[]
      >`insert into rbc_go.accounts (email, display_name)
      values (${`other-${unique}@example.test`}, 'Other') returning id`;
      otherId = other.id;
      const [application] = await sql<
        { id: string }[]
      >`insert into rbc_go.partner_applications
      (owner_account_id, business_name, status, submitted_at)
      values (${ownerId}, 'Test rental', 'approved', now()) returning id`;
      const [partner] = await sql<{ id: string }[]>`insert into rbc_go.partners
      (application_id, owner_account_id, business_name) values (${application.id}, ${ownerId}, 'Test rental') returning id`;
      await sql`insert into rbc_go.partner_members (partner_id, account_id, role)
      values (${partner.id}, ${ownerId}, 'owner')`;
      const [listing] = await sql<{ id: string }[]>`insert into rbc_go.listings
      (partner_id, category, title, location_text, capacity, base_price_satang, deposit_satang, status)
      values (${partner.id}, 'cars', 'Test rental car', 'Phuket', 4, 100000, 30000, 'approved') returning id`;
      if (process.env.RBC_GO_TEST_BASE_URL) {
        const response = await fetch(
          `${process.env.RBC_GO_TEST_BASE_URL}/th/listing/${listing.id}`,
        );
        const html = await response.text();
        assert.equal(response.status, 200);
        assert.match(html, /Test rental car/);
        assert.match(html, /ส่งคำขอจอง/);
      }
      const start = new Date(Date.now() + 5 * 86400000);
      const end = new Date(start.getTime() + 86400000);
      const format = (date: Date) =>
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
          .replace(" ", "T");
      const bookingId = await requestPartnerBooking(customerId, {
        listingId: listing.id,
        startsAt: format(start),
        endsAt: format(end),
        name: "Test Customer",
        email: `customer-${unique}@example.test`,
        phone: "",
        note: "",
        guests: "2",
      });
      assert.equal(
        (await getCustomerPartnerBooking(customerId, bookingId))?.status,
        "requested",
      );
      assert.equal(await getCustomerPartnerBooking(otherId, bookingId), null);
      await assert.rejects(
        decidePartnerBooking(otherId, bookingId, "quote", "1000"),
        { code: "booking_locked" },
      );
      await decidePartnerBooking(ownerId, bookingId, "quote", "1500.50");
      assert.equal(
        (await getCustomerPartnerBooking(customerId, bookingId))?.total_satang,
        "180050",
      );
      await assert.rejects(
        requestPartnerBooking(otherId, {
          listingId: listing.id,
          startsAt: format(start),
          endsAt: format(end),
          name: "Other Customer",
          email: `other-${unique}@example.test`,
          phone: "",
          note: "",
          guests: "1",
        }),
        { code: "dates_unavailable" },
      );
      const [attempt] = await sql<
        { id: string }[]
      >`insert into rbc_go.payment_attempts
      (booking_id, provider, idempotency_key, amount_satang)
      values (${bookingId}, 'omise', ${randomUUID()}, 180050) returning id`;
      const charge = {
        id: "chrg_test_abc123",
        status: "successful" as const,
        livemode: false,
        amount: 180050,
        currency: "THB",
        ref_id: attempt.id,
        authorize_uri: null,
      };
      await assert.rejects(
        applyOmiseCharge(attempt.id, { ...charge, amount: 100 }),
        /does not match/,
      );
      await applyOmiseCharge(attempt.id, charge);
      assert.equal(
        (await getCustomerPartnerBooking(customerId, bookingId))?.status,
        "confirmed",
      );
      const secret = Buffer.from("test-webhook-secret").toString("base64");
      const timestamp = String(Math.floor(Date.now() / 1000));
      const body = JSON.stringify({ key: "charge.complete", data: charge });
      const signature = createHmac("sha256", Buffer.from(secret, "base64"))
        .update(`${timestamp}.${body}`)
        .digest("hex");
      assert.equal(
        verifyOmiseWebhook(body, signature, timestamp, secret),
        true,
      );
      assert.equal(
        verifyOmiseWebhook(body + "x", signature, timestamp, secret),
        false,
      );
    } finally {
      if (ownerId) {
        await sql`delete from rbc_go.payment_attempts where booking_id in
        (select id from rbc_go.bookings where listing_id in
          (select listings.id from rbc_go.listings listings join rbc_go.partners partners on partners.id = listings.partner_id
            where partners.owner_account_id = ${ownerId}))`;
        await sql`delete from rbc_go.bookings where listing_id in
        (select listings.id from rbc_go.listings listings join rbc_go.partners partners on partners.id = listings.partner_id
          where partners.owner_account_id = ${ownerId})`;
        await sql`delete from rbc_go.listings where partner_id in
        (select id from rbc_go.partners where owner_account_id = ${ownerId})`;
        await sql`delete from rbc_go.partners where owner_account_id = ${ownerId}`;
        await sql`delete from rbc_go.partner_applications where owner_account_id = ${ownerId}`;
        await sql`delete from rbc_go.accounts where id = ${ownerId}`;
      }
      if (customerId)
        await sql`delete from rbc_go.accounts where id = ${customerId}`;
      if (otherId) await sql`delete from rbc_go.accounts where id = ${otherId}`;
      await sql.end();
    }
  },
);
