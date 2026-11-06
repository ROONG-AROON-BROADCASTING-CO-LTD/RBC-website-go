import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";

const databaseUrl = process.env.RBC_GO_TEST_DATABASE_URL;
test(
  "email OTP verifies only after delivery and a correct, unexpired, single-use code",
  { skip: !databaseUrl },
  async () => {
    assert.match(new URL(databaseUrl!).pathname, /_test$/);
    process.env.DATABASE_URL = databaseUrl;
    const keys = [
      "EMAIL_PROVIDER",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "PARTNER_OTP_SECRET",
    ] as const;
    const previous = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );
    const originalFetch = globalThis.fetch;
    Object.assign(process.env, {
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "RBC GO <sender@example.test>",
      PARTNER_OTP_SECRET: "test-email-otp-secret-32-characters-minimum",
    });
    let deliveryFails = false;
    const codes = new Map<string, string>();
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.resend.com/emails");
      const payload = JSON.parse(String(init?.body));
      codes.set(payload.to[0], payload.text.match(/\b\d{6}\b/)[0]);
      return new Response("", { status: deliveryFails ? 503 : 200 });
    };
    const { beginEmailSignIn, verifyEmailSignIn } =
      await import("../src/lib/server/email-signin");
    const { createEmailAccountRecord } = await import("../src/lib/server/auth");
    const { getDb } = await import("../src/lib/server/db");
    const sql = getDb();
    const key = randomUUID();
    const emails = [
      "new",
      "existing",
      "expired",
      "locked",
      "failed",
      "google",
    ].map((kind) => `otp-${kind}-${key}@example.test`);
    const clients: string[] = [];
    async function begin(index: number) {
      const client = `otp-test-${randomUUID()}`;
      clients.push(client);
      return beginEmailSignIn("OTP customer", emails[index], client);
    }
    const tokenHash = (token: string) =>
      createHash("sha256").update(token).digest();
    try {
      const first = await begin(0);
      const [before] =
        await sql`select id from rbc_go.accounts where email = ${emails[0]}`;
      assert.equal(before, undefined);
      const correct = codes.get(emails[0])!;
      const wrong = correct === "000000" ? "000001" : "000000";
      await assert.rejects(verifyEmailSignIn(first.token, wrong), {
        code: "invalid_code",
      });
      await assert.rejects(begin(0), { code: "too_many_attempts" });
      const outcomes = await Promise.allSettled([
        verifyEmailSignIn(first.token, correct),
        verifyEmailSignIn(first.token, correct),
      ]);
      assert.equal(
        outcomes.filter((value) => value.status === "fulfilled").length,
        1,
      );
      const [account] =
        await sql`select email_verified_at, phone_verified_at, phone_e164 from rbc_go.accounts where email = ${emails[0]}`;
      assert.ok(account.email_verified_at);
      assert.equal(account.phone_verified_at, null);
      assert.equal(account.phone_e164, null);

      const existingId = await createEmailAccountRecord(
        "Existing customer",
        emails[1],
        "existing-password-12345",
      );
      const existing = await begin(1);
      assert.equal(
        await verifyEmailSignIn(existing.token, codes.get(emails[1])!),
        existingId,
      );

      const expired = await begin(2);
      await sql`update rbc_go.email_signin_challenges set expires_at = now() - interval '1 second' where token_hash = ${tokenHash(expired.token)}`;
      await assert.rejects(
        verifyEmailSignIn(expired.token, codes.get(emails[2])!),
        { code: "code_expired" },
      );

      const locked = await begin(3);
      const lockedCorrect = codes.get(emails[3])!;
      for (let i = 0; i < 5; i++)
        await assert.rejects(
          verifyEmailSignIn(
            locked.token,
            lockedCorrect === "000000" ? "000001" : "000000",
          ),
          { code: "invalid_code" },
        );
      await assert.rejects(verifyEmailSignIn(locked.token, lockedCorrect), {
        code: "code_expired",
      });

      deliveryFails = true;
      await assert.rejects(begin(4), { code: "email_delivery_failed" });
      const [failed] =
        await sql`select consumed_at from rbc_go.email_signin_challenges where email = ${emails[4]}`;
      assert.ok(failed.consumed_at);
      deliveryFails = false;

      const [google] =
        await sql`insert into rbc_go.accounts (email, display_name) values (${emails[5]}, 'Google customer') returning id`;
      await sql`insert into rbc_go.auth_identities (account_id, provider, provider_subject) values (${google.id}, 'google', ${randomUUID()})`;
      const conflict = await begin(5);
      await assert.rejects(
        verifyEmailSignIn(conflict.token, codes.get(emails[5])!),
        { code: "use_existing_sign_in" },
      );
      const [unchanged] =
        await sql`select email_verified_at from rbc_go.accounts where id = ${google.id}`;
      assert.equal(unchanged.email_verified_at, null);
    } finally {
      await sql`delete from rbc_go.accounts where email in ${sql(emails)}`;
      await sql`delete from rbc_go.email_signin_challenges where email in ${sql(emails)}`;
      for (const client of clients)
        await sql`delete from rbc_go.login_attempts where key_hash = ${tokenHash(`email-otp:${client}`)}`;
      await sql.end();
      globalThis.fetch = originalFetch;
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  },
);
