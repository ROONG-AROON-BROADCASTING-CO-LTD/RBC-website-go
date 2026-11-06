import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { AuthError, prepareEmailRegistration } from "./auth";
import { getDb } from "./db";
import { emailConfigurationIssues } from "@/lib/service-config";
import { sendTransactionalEmail } from "./email";

const codeLifetimeMinutes = 10;
const maxSendsPerHour = 5;
const maxCodeAttempts = 5;
export const partnerChallengeCookieName = "rbc_go_partner_email_challenge";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function partnerEmailConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    emailConfigurationIssues().length === 0 &&
    (process.env.PARTNER_OTP_SECRET?.length ?? 0) >= 32,
  );
}

function otpHash(email: string, code: string) {
  const secret = process.env.PARTNER_OTP_SECRET;
  if (!secret || secret.length < 32)
    throw new AuthError("email_service_unavailable");
  return createHmac("sha256", secret)
    .update(`partner-signup:${email}:${code}`)
    .digest();
}

async function sendCode(email: string, code: string, id: string, hash: Buffer) {
  try {
    await sendTransactionalEmail({
      to: email,
      subject: "รหัสยืนยันอีเมลพาร์ตเนอร์ RBC GO",
      text: `รหัสยืนยันของคุณคือ ${code}\n\nรหัสนี้ใช้ได้ ${codeLifetimeMinutes} นาที หากคุณไม่ได้สมัครบัญชี RBC GO ให้ข้ามอีเมลนี้`,
      idempotencyKey: `partner-signup/${id}/${hash.toString("hex")}`,
    });
  } catch {
    throw new AuthError("email_delivery_failed");
  }
}

async function releaseResendLock(id: string, hash: Buffer) {
  const sql = getDb();
  await sql`
    update rbc_go.partner_email_challenges set resend_after = now()
    where id = ${id} and code_hash = ${hash}
  `;
}

export async function beginPartnerEmailRegistration(
  name: string,
  email: string,
  password: string,
) {
  if (!partnerEmailConfigured())
    throw new AuthError("email_service_unavailable");
  const { normalizedName, normalizedEmail, passwordHash } =
    await prepareEmailRegistration(name, email, password);
  const sql = getDb();
  const [existing] = await sql<{ id: string }[]>`
    select id from rbc_go.accounts where lower(email) = ${normalizedEmail}
  `;
  if (existing) throw new AuthError("email_in_use");
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const hash = otpHash(normalizedEmail, code);
  const [challenge] = await sql<{ id: string }[]>`
    insert into rbc_go.partner_email_challenges
      (email, display_name, password_hash, code_hash, expires_at,
       resend_after, send_count, window_started_at)
    values
      (${normalizedEmail}, ${normalizedName}, ${passwordHash}, ${hash},
       now() + interval '10 minutes', now() + interval '60 seconds', 1, now())
    on conflict (email) do update set
      display_name = excluded.display_name,
      password_hash = excluded.password_hash,
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      resend_after = excluded.resend_after,
      attempts = 0,
      send_count = case
        when rbc_go.partner_email_challenges.window_started_at <= now() - interval '1 hour'
          then 1
        else rbc_go.partner_email_challenges.send_count + 1
      end,
      window_started_at = case
        when rbc_go.partner_email_challenges.window_started_at <= now() - interval '1 hour'
          then now()
        else rbc_go.partner_email_challenges.window_started_at
      end
    where rbc_go.partner_email_challenges.resend_after <= now()
      and (rbc_go.partner_email_challenges.window_started_at <= now() - interval '1 hour'
        or rbc_go.partner_email_challenges.send_count < ${maxSendsPerHour})
    returning id
  `;
  if (!challenge) throw new AuthError("code_send_limited");
  try {
    await sendCode(normalizedEmail, code, challenge.id, hash);
  } catch (error) {
    await releaseResendLock(challenge.id, hash);
    throw error;
  }
  return { id: challenge.id, email: normalizedEmail };
}

export async function pendingPartnerEmail(id: string) {
  if (!uuidPattern.test(id)) return null;
  const sql = getDb();
  const [challenge] = await sql<{ email: string }[]>`
    select email from rbc_go.partner_email_challenges
    where id = ${id} and expires_at > now() and attempts < ${maxCodeAttempts}
  `;
  return challenge?.email ?? null;
}

export async function resendPartnerEmailCode(id: string) {
  if (!partnerEmailConfigured())
    throw new AuthError("email_service_unavailable");
  const email = await pendingPartnerEmail(id);
  if (!email) throw new AuthError("code_expired");
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const hash = otpHash(email, code);
  const sql = getDb();
  const [challenge] = await sql<{ id: string }[]>`
    update rbc_go.partner_email_challenges set
      code_hash = ${hash},
      expires_at = now() + interval '10 minutes',
      resend_after = now() + interval '60 seconds',
      attempts = 0,
      send_count = case
        when window_started_at <= now() - interval '1 hour' then 1
        else send_count + 1
      end,
      window_started_at = case
        when window_started_at <= now() - interval '1 hour' then now()
        else window_started_at
      end
    where id = ${id} and resend_after <= now()
      and (window_started_at <= now() - interval '1 hour'
        or send_count < ${maxSendsPerHour})
    returning id
  `;
  if (!challenge) throw new AuthError("code_send_limited");
  try {
    await sendCode(email, code, id, hash);
  } catch (error) {
    await releaseResendLock(id, hash);
    throw error;
  }
  return email;
}

export async function verifyPartnerEmailCode(id: string, code: string) {
  if (!partnerEmailConfigured())
    throw new AuthError("email_service_unavailable");
  if (!/^[0-9]{6}$/.test(code)) throw new AuthError("invalid_code");
  if (!uuidPattern.test(id)) throw new AuthError("code_expired");
  const sql = getDb();
  let result: { accountId: string } | { error: string };
  try {
    result = await sql.begin(async (tx) => {
      const [challenge] = await tx<
        {
          email: string;
          display_name: string;
          password_hash: string;
          code_hash: Buffer;
          attempts: number;
          expires_at: Date;
        }[]
      >`
        select email, display_name, password_hash, code_hash, attempts, expires_at
        from rbc_go.partner_email_challenges where id = ${id} for update
      `;
      if (!challenge || challenge.expires_at <= new Date())
        return { error: "code_expired" };
      if (challenge.attempts >= maxCodeAttempts)
        return { error: "too_many_code_attempts" };
      const actual = otpHash(challenge.email, code);
      if (!timingSafeEqual(actual, challenge.code_hash)) {
        await tx`
          update rbc_go.partner_email_challenges set attempts = attempts + 1
          where id = ${id}
        `;
        return {
          error:
            challenge.attempts + 1 >= maxCodeAttempts
              ? "too_many_code_attempts"
              : "invalid_code",
        };
      }
      const [account] = await tx<{ id: string }[]>`
        insert into rbc_go.accounts (email, display_name, email_verified_at)
        values (${challenge.email}, ${challenge.display_name}, now())
        returning id
      `;
      await tx`
        insert into rbc_go.account_credentials (account_id, password_hash)
        values (${account.id}, ${challenge.password_hash})
      `;
      await tx`
        insert into rbc_go.auth_identities (account_id, provider, provider_subject)
        values (${account.id}, 'email', ${challenge.email})
      `;
      await tx`delete from rbc_go.partner_email_challenges where id = ${id}`;
      return { accountId: account.id };
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    )
      throw new AuthError("email_in_use");
    throw error;
  }
  if ("error" in result) throw new AuthError(result.error);
  return result.accountId;
}
