import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
const url = process.env.RBC_GO_TEST_DATABASE_URL;
test(
  "email verification and password reset are single-use and revoke old sessions",
  { skip: !url },
  async () => {
    assert.match(new URL(url!).pathname, /_test$/);
    process.env.DATABASE_URL = url;
    const previous = {
      key: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      origin: process.env.APP_BASE_URL,
    };
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "RBC GO <no-reply@example.test>";
    process.env.APP_BASE_URL = "http://localhost:3101";
    const { getDb } = await import("../src/lib/server/db");
    const sql = getDb();
    const { createEmailAccountRecord, createSessionRecord, authenticateEmail } =
      await import("../src/lib/server/auth");
    const { requestAccountLink, consumeAccountLink, requestPasswordReset } =
      await import("../src/lib/server/account-recovery");
    const email = `recovery-${randomUUID()}@example.test`;
    let accountId = "";
    try {
      accountId = await createEmailAccountRecord(
        "Recovery customer",
        email,
        "old-password-12345",
      );
      await requestAccountLink(accountId, "verify", "en");
      const [verification] = await sql<
        { body: string }[]
      >`select body from rbc_go.email_outbox where recipient=${email} order by created_at desc limit 1`;
      const token = new URL(
        verification.body.match(/http:\/\/localhost[^\s]+/)![0],
      ).searchParams.get("token")!;
      await consumeAccountLink(token, "verify");
      await assert.rejects(consumeAccountLink(token, "verify"), {
        code: "code_expired",
      });
      const [verified] = await sql<
        { email_verified_at: Date | null }[]
      >`select email_verified_at from rbc_go.accounts where id=${accountId}`;
      assert.ok(verified.email_verified_at);
      const session = await createSessionRecord(accountId);
      await requestPasswordReset(email, "en");
      const [reset] = await sql<
        { body: string }[]
      >`select body from rbc_go.email_outbox where recipient=${email} and subject like '%Reset%' order by created_at desc limit 1`;
      const resetToken = new URL(
        reset.body.match(/http:\/\/localhost[^\s]+/)![0],
      ).searchParams.get("token")!;
      await assert.rejects(consumeAccountLink(resetToken, "reset", "short"), {
        code: "invalid_password",
      });
      await consumeAccountLink(resetToken, "reset", "new-password-12345");
      await assert.rejects(
        consumeAccountLink(resetToken, "reset", "another-password-12345"),
        { code: "code_expired" },
      );
      await assert.rejects(authenticateEmail(email, "old-password-12345"), {
        code: "invalid_credentials",
      });
      assert.equal(
        await authenticateEmail(email, "new-password-12345"),
        accountId,
      );
      const [revoked] = await sql<
        { revoked_at: Date | null }[]
      >`select revoked_at from rbc_go.user_sessions where token_hash=${createHash("sha256").update(session.token).digest()}`;
      assert.ok(revoked.revoked_at);
    } finally {
      await sql`delete from rbc_go.email_outbox where recipient=${email}`;
      if (accountId)
        await sql`delete from rbc_go.accounts where id=${accountId}`;
      await sql`delete from rbc_go.login_attempts where key_hash=${createHash("sha256").update(`login:${email}`).digest()}`;
      await sql.end();
      for (const [key, value] of Object.entries({
        RESEND_API_KEY: previous.key,
        EMAIL_FROM: previous.from,
        APP_BASE_URL: previous.origin,
      }))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
  },
);
