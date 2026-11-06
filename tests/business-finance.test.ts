import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  commissionFromPercent,
  splitRental,
  financePeriod,
} from "../src/lib/finance";

test("commission uses exact satang, validates rates and preserves every satang", () => {
  assert.deepEqual(splitRental(1000000, 1000), {
    company: 100000,
    partner: 900000,
  });
  assert.deepEqual(splitRental(150050, 1000), {
    company: 15005,
    partner: 135045,
  });
  assert.deepEqual(splitRental(101, 1250), { company: 12, partner: 89 });
  assert.deepEqual(splitRental(100, 0), { company: 0, partner: 100 });
  assert.deepEqual(splitRental(100, 10000), { company: 100, partner: 0 });
  assert.equal(commissionFromPercent("12.50"), 1250);
  for (const value of ["-1", "100.01", "1.001", "", "1e2", "NaN"])
    assert.equal(commissionFromPercent(value), null);
  assert.throws(() => splitRental(-1, 1000));
});
test("monthly finance reports use Bangkok boundaries", () => {
  assert.equal(
    financePeriod("month", new Date("2026-10-31T18:00:00Z")).from.toISOString(),
    "2026-10-31T17:00:00.000Z",
  );
  assert.equal(financePeriod("all").from.getTime(), 0);
});

const dbUrl = process.env.RBC_GO_TEST_DATABASE_URL;
test(
  "admin and partner share a verified ledger; withdrawals enforce ownership, completion, refunds and concurrency",
  { skip: !dbUrl },
  async () => {
    assert.match(new URL(dbUrl!).pathname, /_test$/);
    process.env.DATABASE_URL = dbUrl;
    const { getDb } = await import("../src/lib/server/db");
    const { createEmailAccountRecord } = await import("../src/lib/server/auth");
    const {
      staffFinancials,
      partnerFinancials,
      requestPartnerWithdrawal,
      setCommissionPolicy,
      commissionPolicy,
    } = await import("../src/lib/server/business-finance");
    const { applyOmiseCharge } =
      await import("../src/lib/server/booking-payments");
    const { payOutBooking, applyOmiseWebhookTransfer, requestBookingRefund } =
      await import("../src/lib/server/settlements");
    const { requestPartnerBooking, decidePartnerBooking } =
      await import("../src/lib/server/partner-bookings");
    const sql = getDb(),
      unique = randomUUID(),
      ids: string[] = [];
    let partnerId = "",
      listingId = "";
    const previousFetch = globalThis.fetch,
      originalPolicy = (await commissionPolicy()).commission_bps;
    try {
      for (const name of ["admin", "owner", "editor", "customer", "outsider"]) {
        ids.push(
          await createEmailAccountRecord(
            name,
            `${name}-${unique}@example.test`,
            "finance-test-password-123",
          ),
        );
      }
      const [admin, owner, editor, customer, outsider] = ids;
      await sql`insert into rbc_go.staff_members(account_id,role) values(${admin},'admin')`;
      const [app] =
        await sql`insert into rbc_go.partner_applications(owner_account_id,business_name,status,submitted_at) values(${owner},${`Finance ${unique}`},'approved',now()) returning id`;
      const [partner] =
        await sql`insert into rbc_go.partners(application_id,owner_account_id,business_name) values(${app.id},${owner},${`Finance ${unique}`}) returning id`;
      partnerId = partner.id;
      await sql`insert into rbc_go.partner_members(partner_id,account_id,role) values(${partner.id},${owner},'owner'),(${partner.id},${editor},'editor')`;
      const [listing] =
        await sql`insert into rbc_go.listings(partner_id,category,title,location_text,capacity,base_price_satang,deposit_satang,status) values(${partner.id},'cars','Finance test car','Bangkok',4,100000,10000,'approved') returning id`;
      listingId = listing.id;
      const [booking] =
        await sql`insert into rbc_go.bookings(customer_account_id,listing_id,starts_at,ends_at,status,total_satang,deposit_satang,price_snapshot,traveler_snapshot,idempotency_key)
      values(${customer},${listing.id},now()-interval '2 days',now()-interval '1 day','completed',110000,10000,'{}','{}',${randomUUID()}) returning id`;
      const [attempt] =
        await sql`insert into rbc_go.payment_attempts(booking_id,provider,idempotency_key,amount_satang,status) values(${booking.id},'omise',${randomUUID()},110000,'pending') returning id`;
      const filters = { period: "all", mode: "test", partnerId: partner.id };
      assert.equal(
        (await staffFinancials(admin, filters)).summary.paid,
        "0",
        "Pending charges are not income",
      );
      const charge = {
        id: `chrg_test_${unique.replaceAll("-", "")}`,
        status: "successful" as const,
        livemode: false,
        amount: 110000,
        currency: "THB",
        ref_id: attempt.id,
        authorize_uri: null,
      };
      await applyOmiseCharge(attempt.id, charge, `evnt_test_${unique}`);
      const [captured] =
        await sql`select captured_at from rbc_go.payment_attempts where id=${attempt.id}`;
      await applyOmiseCharge(attempt.id, charge, `evnt_test_${unique}`);
      await applyOmiseCharge(attempt.id, charge);
      const [again] =
        await sql`select captured_at from rbc_go.payment_attempts where id=${attempt.id}`;
      assert.equal(
        captured.captured_at.toISOString(),
        again.captured_at.toISOString(),
        "Repeated events preserve the original payment date",
      );
      let staff = await staffFinancials(admin, filters),
        own = await partnerFinancials(owner, filters);
      assert.deepEqual(staff.summary, own.summary);
      assert.equal(staff.summary.paid, "110000");
      assert.equal(staff.summary.company, "10000");
      assert.equal(staff.summary.partner, "90000");
      assert.equal(staff.summary.deposit, "10000");
      assert.equal(
        (await staffFinancials(admin, { ...filters, mode: "live" })).summary
          .paid,
        "0",
        "Sandbox never contributes to live totals",
      );
      await assert.rejects(staffFinancials(owner, filters), {
        code: "access_denied",
      });
      await assert.rejects(partnerFinancials(outsider, filters), {
        code: "access_denied",
      });
      await assert.rejects(requestPartnerWithdrawal(outsider, booking.id), {
        code: "access_denied",
      });
      await assert.rejects(requestPartnerWithdrawal(editor, booking.id), {
        code: "access_denied",
      });
      await assert.rejects(requestPartnerWithdrawal(owner, booking.id), {
        code: "withdrawal_unavailable",
      });
      await sql`insert into rbc_go.partner_payout_accounts(partner_id,recipient_id,livemode,verified_by) values(${partner.id},${`recp_test_${unique.replaceAll("-", "")}`},false,${admin})`;
      await assert.rejects(requestPartnerWithdrawal(owner, booking.id), {
        code: "withdrawal_unavailable",
      });
      await sql`insert into rbc_go.refund_requests(booking_id,payment_attempt_id,kind,reason,status,amount_satang) values(${booking.id},${attempt.id},'deposit','Test deposit returned','succeeded',10000),(${booking.id},${attempt.id},'cancellation','Partial rental refund','succeeded',1000)`;
      own = await partnerFinancials(owner, filters);
      assert.equal(own.summary.refunded, "11000");
      assert.equal(own.summary.company, "9900");
      assert.equal(own.summary.available, "89100");
      assert.equal(own.summary.deposit, "0");
      // A different company's ID from the query string cannot broaden partner access.
      assert.equal(
        (
          await partnerFinancials(owner, {
            ...filters,
            partnerId: randomUUID(),
          })
        ).summary.paid,
        "110000",
      );
      await sql`update rbc_go.bookings set status='confirmed' where id=${booking.id}`;
      await assert.rejects(requestPartnerWithdrawal(owner, booking.id), {
        code: "withdrawal_unavailable",
      });
      await sql`update rbc_go.bookings set status='completed' where id=${booking.id}`;
      await assert.rejects(setCommissionPolicy(owner, "20"), {
        code: "access_denied",
      });
      await setCommissionPolicy(admin, "20");
      assert.equal(
        (await partnerFinancials(owner, filters)).summary.company,
        "9900",
        "Changing policy does not change old bookings",
      );
      const results = await Promise.allSettled([
        requestPartnerWithdrawal(owner, booking.id),
        requestPartnerWithdrawal(owner, booking.id),
      ]);
      assert.equal(
        results.filter((r) => r.status === "fulfilled").length,
        1,
        "Concurrent requests reserve exactly once",
      );
      own = await partnerFinancials(owner, filters);
      assert.equal(own.summary.available, "0");
      assert.equal(own.summary.requested, "89100");
      await assert.rejects(
        requestBookingRefund(
          customer,
          booking.id,
          "deposit",
          "Duplicate after withdrawal",
        ),
        { code: "settlement_locked" },
      );
      let calls = 0,
        transferId = "";
      globalThis.fetch = async (input, init) => {
        const target = String(input);
        if (target.includes("/recipients/"))
          return Response.json({
            object: "recipient",
            id: `recp_test_${unique.replaceAll("-", "")}`,
            active: true,
            verified: true,
            livemode: false,
          });
        if (target.endsWith("/transfers")) {
          calls++;
          const body = new URLSearchParams(String(init?.body));
          assert.equal(body.get("amount"), "89100");
          transferId = body.get("metadata[payout_id]")!;
          return Response.json({
            object: "transfer",
            id: `trsf_test_${unique.replaceAll("-", "")}`,
            amount: 89100,
            currency: "THB",
            recipient: `recp_test_${unique.replaceAll("-", "")}`,
            livemode: false,
            paid: false,
            failure_code: null,
            total_fee: 3210,
            net: 85890,
            metadata: { payout_id: transferId },
          });
        }
        if (target.includes("/transfers/"))
          return Response.json({
            object: "transfer",
            id: `trsf_test_${unique.replaceAll("-", "")}`,
            amount: 89100,
            currency: "THB",
            recipient: `recp_test_${unique.replaceAll("-", "")}`,
            livemode: false,
            paid: true,
            failure_code: null,
            total_fee: 3210,
            net: 85890,
            metadata: { payout_id: transferId },
          });
        throw new Error("Unexpected external request");
      };
      await assert.rejects(payOutBooking(owner, booking.id), {
        code: "access_denied",
      });
      await payOutBooking(admin, booking.id);
      await assert.rejects(payOutBooking(admin, booking.id), {
        code: "settlement_locked",
      });
      assert.equal(calls, 1);
      assert.equal(
        (await partnerFinancials(owner, filters)).summary.transferred,
        "0",
        "Pending transfers are not bank receipts",
      );
      await applyOmiseWebhookTransfer(
        `trsf_test_${unique.replaceAll("-", "")}`,
      );
      await applyOmiseWebhookTransfer(
        `trsf_test_${unique.replaceAll("-", "")}`,
      );
      own = await partnerFinancials(owner, filters);
      staff = await staffFinancials(admin, filters);
      assert.equal(
        own.summary.transferred,
        "85890",
        "Bank total is provider net, after actual transfer fees",
      );
      assert.equal(own.summary.awaiting, "0");
      assert.equal(own.summary.requested, "0");
      assert.deepEqual(own.summary, staff.summary);
      // New quotes snapshot the new policy; later changes cannot rewrite it.
      const quoteId = await requestPartnerBooking(customer, {
        listingId: listing.id,
        startsAt: new Date(Date.now() + 5 * 86400000)
          .toISOString()
          .slice(0, 16),
        endsAt: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16),
        name: "Customer",
        email: "test@example.test",
        phone: "",
        note: "",
        guests: "1",
      });
      await decidePartnerBooking(owner, quoteId, "quote", "1000");
      const [quoted] =
        await sql`select commission_bps from rbc_go.bookings where id=${quoteId}`;
      assert.equal(quoted.commission_bps, 2000);
      await setCommissionPolicy(admin, "10");
      const [unchanged] =
        await sql`select commission_bps from rbc_go.bookings where id=${quoteId}`;
      assert.equal(unchanged.commission_bps, 2000);
    } finally {
      globalThis.fetch = previousFetch;
      await sql`update rbc_go.business_settings set commission_bps=${originalPolicy},updated_by=null where id=true`;
      if (listingId) {
        await sql`delete from rbc_go.payment_events where payment_attempt_id in(select id from rbc_go.payment_attempts where booking_id in(select id from rbc_go.bookings where listing_id=${listingId}))`;
        await sql`delete from rbc_go.refund_requests where booking_id in(select id from rbc_go.bookings where listing_id=${listingId})`;
        await sql`delete from rbc_go.payment_attempts where booking_id in(select id from rbc_go.bookings where listing_id=${listingId})`;
        await sql`delete from rbc_go.bookings where listing_id=${listingId}`;
        await sql`delete from rbc_go.listings where id=${listingId}`;
      }
      if (partnerId) {
        await sql`delete from rbc_go.partner_payout_accounts where partner_id=${partnerId}`;
        await sql`delete from rbc_go.partner_members where partner_id=${partnerId}`;
        await sql`delete from rbc_go.partners where id=${partnerId}`;
      }
      for (const id of ids) {
        await sql`delete from rbc_go.partner_applications where owner_account_id=${id}`;
        await sql`delete from rbc_go.accounts where id=${id}`;
      }
      await sql.end();
    }
  },
);
