import test from "node:test";
import assert from "node:assert/strict";
import { randomInt, randomUUID, createHash } from "node:crypto";
const url = process.env.RBC_GO_TEST_DATABASE_URL;
test(
  "phone accounts require provider-approved OTP and reject reuse and repeated sends",
  { skip: !url },
  async () => {
    assert.match(new URL(url!).pathname, /_test$/);
    process.env.DATABASE_URL = url;
    const previous = {
      fetch: globalThis.fetch,
      key: process.env.TWILIO_API_KEY,
      secret: process.env.TWILIO_API_SECRET,
      service: process.env.TWILIO_VERIFY_SERVICE_SID,
    };
    process.env.TWILIO_API_KEY = `SK${"a".repeat(32)}`;
    process.env.TWILIO_API_SECRET = "test-only";
    process.env.TWILIO_VERIFY_SERVICE_SID = `VA${"b".repeat(32)}`;
    const phone = `+668${randomInt(10000000, 99999999)}`,
      client = randomUUID();
    let sends = 0;
    globalThis.fetch = async (input, init) => {
      assert.ok(String(input).startsWith("https://verify.twilio.com/"));
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get("To"), phone);
      if (String(input).endsWith("/Verifications")) {
        sends++;
        return Response.json({ status: "pending", to: phone });
      }
      return Response.json({
        status: body.get("Code") === "654321" ? "approved" : "pending",
        to: phone,
      });
    };
    const { getDb } = await import("../src/lib/server/db");
    const sql = getDb();
    const { beginPhoneChallenge, verifyPhoneChallenge } =
      await import("../src/lib/server/phone-auth");
    let accountId = "";
    try {
      const challenge = await beginPhoneChallenge(
        "Phone customer",
        phone,
        client,
      );
      await assert.rejects(
        beginPhoneChallenge("Phone customer", phone, client),
        { code: "too_many_attempts" },
      );
      assert.equal(sends, 1);
      await assert.rejects(verifyPhoneChallenge(challenge.token, "123456"), {
        code: "invalid_code",
      });
      const [attempt] = await sql<
        { attempts: number }[]
      >`select attempts from rbc_go.phone_challenges where phone_e164=${phone}`;
      assert.equal(attempt.attempts, 1);
      accountId = await verifyPhoneChallenge(challenge.token, "654321");
      const [account] = await sql<
        { phone_verified_at: Date | null }[]
      >`select phone_verified_at from rbc_go.accounts where id=${accountId}`;
      assert.ok(account.phone_verified_at);
      await assert.rejects(verifyPhoneChallenge(challenge.token, "654321"), {
        code: "code_expired",
      });
    } finally {
      await sql`delete from rbc_go.phone_challenges where phone_e164=${phone}`;
      if (accountId)
        await sql`delete from rbc_go.accounts where id=${accountId}`;
      await sql`delete from rbc_go.login_attempts where key_hash=${createHash("sha256").update(`sms:${client}`).digest()}`;
      await sql.end();
      globalThis.fetch = previous.fetch;
      for (const [key, value] of Object.entries({
        TWILIO_API_KEY: previous.key,
        TWILIO_API_SECRET: previous.secret,
        TWILIO_VERIFY_SERVICE_SID: previous.service,
      }))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
  },
);
