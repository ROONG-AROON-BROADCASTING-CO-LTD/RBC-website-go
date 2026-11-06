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
    const {
      saveListing,
      listSavedListings,
      sendBookingMessage,
      listBookingMessages,
      submitBookingReview,
      listCustomerReviews,
      addAvailabilityBlock,
      listAvailabilityBlocks,
      removeAvailabilityBlock,
      progressBooking,
    } = await import("../src/lib/server/workspace");
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
      const { payPartnerBooking } =
        await import("../src/lib/server/booking-payments");
      const modeKeys = [
        "OMISE_MODE",
        "ENABLE_LIVE_PAYMENTS",
        "APP_BASE_URL",
        "OMISE_PUBLIC_KEY",
        "OMISE_SECRET_KEY",
      ] as const;
      const previousMode = Object.fromEntries(
        modeKeys.map((key) => [key, process.env[key]]),
      );
      Object.assign(process.env, {
        OMISE_MODE: "live",
        ENABLE_LIVE_PAYMENTS: "true",
        APP_BASE_URL: "https://example.test",
        OMISE_PUBLIC_KEY: "pkey_live_testonly",
        OMISE_SECRET_KEY: "skey_live_testonly",
      });
      try {
        await assert.rejects(
          payPartnerBooking(
            customerId,
            bookingId,
            "tokn_testonly",
            "https://example.test",
          ),
          { code: "verification_required" },
        );
        const [attemptCount] = await sql<
          { count: number }[]
        >`select count(*)::integer as count from rbc_go.payment_attempts where booking_id=${bookingId}`;
        assert.equal(
          attemptCount.count,
          0,
          "Unverified customers cannot create a live payment attempt",
        );
      } finally {
        for (const key of modeKeys) {
          if (previousMode[key] === undefined) delete process.env[key];
          else process.env[key] = previousMode[key];
        }
      }
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

      await saveListing(customerId, listing.id, true);
      assert.equal((await listSavedListings(customerId))[0].id, listing.id);
      assert.equal((await listSavedListings(otherId)).length, 0);
      await saveListing(customerId, listing.id, false);
      assert.equal((await listSavedListings(customerId)).length, 0);
      await sendBookingMessage(
        customerId,
        bookingId,
        "Please confirm the pickup point.",
      );
      assert.equal(
        (await listBookingMessages(ownerId, bookingId))[0].body,
        "Please confirm the pickup point.",
      );
      await assert.rejects(listBookingMessages(otherId, bookingId), {
        code: "booking_not_found",
      });
      await assert.rejects(
        sendBookingMessage(otherId, bookingId, "Unauthorized"),
        { code: "booking_not_found" },
      );
      await assert.rejects(
        submitBookingReview(customerId, bookingId, 5, "Too early"),
        { code: "review_unavailable" },
      );
      await assert.rejects(progressBooking(ownerId, bookingId, true), {
        code: "booking_locked",
      });
      await assert.rejects(
        addAvailabilityBlock(
          ownerId,
          listing.id,
          format(start),
          format(end),
          "Maintenance",
        ),
        { code: "dates_unavailable" },
      );

      const blockedStart = new Date(end.getTime() + 86400000);
      const blockedEnd = new Date(blockedStart.getTime() + 86400000);
      await addAvailabilityBlock(
        ownerId,
        listing.id,
        format(blockedStart),
        format(blockedEnd),
        "Maintenance",
      );
      const [blocked] = await listAvailabilityBlocks(ownerId);
      await assert.rejects(removeAvailabilityBlock(otherId, blocked.id), {
        code: "listing_unavailable",
      });
      await assert.rejects(
        requestPartnerBooking(customerId, {
          listingId: listing.id,
          startsAt: format(blockedStart),
          endsAt: format(blockedEnd),
          name: "Customer",
          email: "customer@example.test",
          phone: "",
          note: "",
          guests: "1",
        }),
        { code: "dates_unavailable" },
      );
      await removeAvailabilityBlock(ownerId, blocked.id);
      assert.equal((await listAvailabilityBlocks(ownerId)).length, 0);

      await sql`update rbc_go.bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour' where id = ${bookingId}`;
      await assert.rejects(progressBooking(otherId, bookingId, false), {
        code: "booking_locked",
      });
      await progressBooking(ownerId, bookingId, false);
      await progressBooking(ownerId, bookingId, true);
      await submitBookingReview(customerId, bookingId, 5, "Great service.");
      assert.equal(
        (await listCustomerReviews(customerId))[0].body,
        "Great service.",
      );
      await assert.rejects(
        submitBookingReview(customerId, bookingId, 5, "Duplicate"),
        { code: "review_unavailable" },
      );
      const [notifications] = await sql<
        { count: number }[]
      >`select count(*)::integer as count from rbc_go.email_outbox where booking_id = ${bookingId}`;
      assert.ok(
        notifications.count >= 6,
        "Booking changes queue customer and partner notifications transactionally",
      );
      const {
        requestBookingRefund,
        approveRefund,
        registerPayoutRecipient,
        payOutBooking,
        applyPayout,
      } = await import("../src/lib/server/settlements");
      await sql`insert into rbc_go.staff_members(account_id,role) values(${otherId},'admin')`;
      const previousFetch = globalThis.fetch,
        previousCommission = process.env.PLATFORM_COMMISSION_BPS;
      process.env.PLATFORM_COMMISSION_BPS = "1000";
      let refundCalls = 0,
        transferCalls = 0;
      let transfer:
        | {
            id: string;
            livemode: boolean;
            amount: number;
            currency: string;
            recipient: string;
            paid: boolean;
            failure_code: null;
            metadata: { payout_id: string };
          }
        | undefined;
      globalThis.fetch = async (input, init) => {
        const target = String(input),
          data = new URLSearchParams(String(init?.body ?? ""));
        if (target.endsWith("/recipients/recp_test_partner1"))
          return Response.json({
            object: "recipient",
            id: "recp_test_partner1",
            livemode: false,
            active: true,
            verified: true,
          });
        if (target.endsWith("/charges/chrg_test_abc123/refunds")) {
          refundCalls++;
          return Response.json({
            object: "refund",
            id: "rfnd_test_refund1",
            livemode: false,
            amount: Number(data.get("amount")),
            currency: "THB",
            charge: "chrg_test_abc123",
            status: "closed",
            metadata: { refund_id: data.get("metadata[refund_id]") },
          });
        }
        if (target.endsWith("/transfers")) {
          transferCalls++;
          transfer = {
            id: "trsf_test_transfer1",
            livemode: false,
            amount: Number(data.get("amount")),
            currency: "THB",
            recipient: data.get("recipient")!,
            paid: false,
            failure_code: null,
            metadata: { payout_id: data.get("metadata[payout_id]")! },
          };
          return Response.json({ object: "transfer", ...transfer });
        }
        throw new Error("Unexpected payment API request in test");
      };
      try {
        await requestBookingRefund(
          customerId,
          bookingId,
          "deposit",
          "Please return the deposit.",
        );
        const [refund] = await sql<
          { id: string }[]
        >`select id from rbc_go.refund_requests where booking_id=${bookingId}`;
        await assert.rejects(
          requestBookingRefund(customerId, bookingId, "deposit", "Duplicate"),
          { code: "refund_in_progress" },
        );
        await assert.rejects(approveRefund(ownerId, refund.id, "300"), {
          code: "access_denied",
        });
        await assert.rejects(approveRefund(otherId, refund.id, "301"), {
          code: "invalid_price",
        });
        await approveRefund(otherId, refund.id, "300");
        await assert.rejects(approveRefund(otherId, refund.id, "300"), {
          code: "refund_in_progress",
        });
        assert.equal(refundCalls, 1, "A refund cannot be sent twice");
        await registerPayoutRecipient(
          otherId,
          partner.id,
          "recp_test_partner1",
        );
        await payOutBooking(otherId, bookingId);
        assert.equal(
          transfer!.amount,
          135045,
          "Payout excludes the deposit and applies the explicitly configured commission",
        );
        await assert.rejects(payOutBooking(otherId, bookingId), {
          code: "settlement_locked",
        });
        assert.equal(transferCalls, 1, "A payout cannot be sent twice");
        await applyPayout(transfer!.metadata.payout_id, {
          ...transfer!,
          paid: true,
        });
        await applyPayout(transfer!.metadata.payout_id, transfer!);
        const [paid] = await sql<
          { status: string }[]
        >`select status from rbc_go.payouts where booking_id=${bookingId}`;
        assert.equal(
          paid.status,
          "paid",
          "A stale provider event cannot reverse a paid transfer",
        );
        await applyOmiseCharge(attempt.id, charge, `evnt_test_${unique}`);
        await applyOmiseCharge(attempt.id, charge, `evnt_test_${unique}`);
        const [events] = await sql<
          { count: number }[]
        >`select count(*)::integer as count from rbc_go.payment_events where payment_attempt_id=${attempt.id}`;
        assert.equal(events.count, 1);
      } finally {
        globalThis.fetch = previousFetch;
        if (previousCommission === undefined)
          delete process.env.PLATFORM_COMMISSION_BPS;
        else process.env.PLATFORM_COMMISSION_BPS = previousCommission;
      }
    } finally {
      if (ownerId) {
        await sql`delete from rbc_go.payment_events where payment_attempt_id in
        (select attempts.id from rbc_go.payment_attempts attempts join rbc_go.bookings bookings on bookings.id=attempts.booking_id
          join rbc_go.listings listings on listings.id=bookings.listing_id join rbc_go.partners partners on partners.id=listings.partner_id where partners.owner_account_id=${ownerId})`;
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
