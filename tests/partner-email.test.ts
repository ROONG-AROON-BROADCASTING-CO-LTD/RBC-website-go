import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";

const testUrl =
  process.env.RBC_GO_TEST_DATABASE_URL ??
  (process.env.RBC_GO_TEST_RUN_LOCAL === "1"
    ? process.env.DATABASE_URL
    : undefined);

test(
  "partner account is created only after the emailed code is verified",
  { skip: !testUrl },
  async () => {
    assert.match(new URL(testUrl!).pathname, /_(test|dev)$/);
    process.env.DATABASE_URL = testUrl;
    const previous = {
      fetch: globalThis.fetch,
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      secret: process.env.PARTNER_OTP_SECRET,
    };
    process.env.RESEND_API_KEY = "re_test_only";
    process.env.EMAIL_FROM = "RBC GO <no-reply@example.test>";
    process.env.PARTNER_OTP_SECRET =
      "test-secret-unique-to-partner-otp-flow-12345";
    const sent: { to: string; code: string }[] = [];
    globalThis.fetch = async (input, init) => {
      assert.equal(input, "https://api.resend.com/emails");
      const payload = JSON.parse(String(init?.body));
      const code = String(payload.text).match(/\b[0-9]{6}\b/)?.[0];
      assert.ok(code);
      sent.push({ to: payload.to[0], code });
      return Response.json({ id: randomUUID() });
    };
    const { getDb } = await import("../src/lib/server/db");
    const {
      beginPartnerEmailRegistration,
      pendingPartnerEmail,
      resendPartnerEmailCode,
      verifyPartnerEmailCode,
    } = await import("../src/lib/server/partner-email");
    const { authenticateEmail } = await import("../src/lib/server/auth");
    const sql = getDb();
    const email = `partner-otp-${randomUUID()}@example.test`;
    const password = "test-password-12345";
    let accountId: string | undefined;
    try {
      const challenge = await beginPartnerEmailRegistration(
        "OTP partner",
        email,
        password,
      );
      assert.equal(await pendingPartnerEmail(challenge.id), email);
      assert.deepEqual(
        sent.map((message) => message.to),
        [email],
      );
      const [before] = await sql<{ count: number }[]>`
        select count(*)::integer as count from rbc_go.accounts where email = ${email}
      `;
      assert.equal(before.count, 0);
      await assert.rejects(
        beginPartnerEmailRegistration("OTP partner", email, password),
        { code: "code_send_limited" },
      );
      await assert.rejects(resendPartnerEmailCode(challenge.id), {
        code: "code_send_limited",
      });
      assert.equal(sent.length, 1);
      await sql`
        update rbc_go.partner_email_challenges
        set resend_after = now() - interval '1 second'
        where id = ${challenge.id}
      `;
      assert.equal(await resendPartnerEmailCode(challenge.id), email);
      assert.equal(sent.length, 2);
      const latestCode = sent[1].code;
      await assert.rejects(
        verifyPartnerEmailCode(
          challenge.id,
          latestCode === "000000" ? "000001" : "000000",
        ),
        { code: "invalid_code" },
      );
      accountId = await verifyPartnerEmailCode(challenge.id, latestCode);
      const [account] = await sql<{ email_verified_at: Date | null }[]>`
        select email_verified_at from rbc_go.accounts where id = ${accountId}
      `;
      assert.ok(account.email_verified_at);
      assert.equal(await pendingPartnerEmail(challenge.id), null);
      assert.equal(await authenticateEmail(email, password), accountId);
      await assert.rejects(verifyPartnerEmailCode(challenge.id, latestCode), {
        code: "code_expired",
      });
    } finally {
      if (accountId)
        await sql`delete from rbc_go.accounts where id = ${accountId}`;
      await sql`delete from rbc_go.partner_email_challenges where email = ${email}`;
      const loginKey = createHash("sha256").update(`login:${email}`).digest();
      await sql`delete from rbc_go.login_attempts where key_hash = ${loginKey}`;
      await sql.end();
      globalThis.fetch = previous.fetch;
      for (const [key, value] of [
        ["RESEND_API_KEY", previous.apiKey],
        ["EMAIL_FROM", previous.from],
        ["PARTNER_OTP_SECRET", previous.secret],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);
