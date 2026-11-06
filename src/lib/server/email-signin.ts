import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { emailConfigurationIssues } from "@/lib/service-config";
import { AuthError } from "./auth";
import { getDb } from "./db";
import { sendTransactionalEmail } from "./email";

const digest = (value: string) => createHash("sha256").update(value).digest();
export function emailSignInConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    !emailConfigurationIssues().length &&
    (process.env.PARTNER_OTP_SECRET?.length ?? 0) >= 32,
  );
}
function codeHash(token: string, email: string, code: string) {
  const secret = process.env.PARTNER_OTP_SECRET;
  if (!secret || secret.length < 32)
    throw new AuthError("email_service_unavailable");
  return createHmac("sha256", secret)
    .update(`customer-signin:${token}:${email}:${code}`)
    .digest();
}

export async function beginEmailSignIn(
  name: string,
  email: string,
  clientKey: string,
) {
  if (!emailSignInConfigured())
    throw new AuthError("email_service_unavailable");
  const normalized = email.trim().toLowerCase();
  if (
    !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(normalized) ||
    normalized.length > 254
  )
    throw new AuthError("invalid_email");
  if (name.trim().length > 120) throw new AuthError("invalid_name");
  const token = randomBytes(32).toString("base64url");
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const hash = codeHash(token, normalized, code);
  const expires = new Date(Date.now() + 600000);
  const sql = getDb();
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('rbc_go:email-signin-rate'))`;
    const [recent] = await tx<{ count: number; cooldown: boolean }[]>`
      select count(*)::integer as count,
        coalesce(bool_or(created_at > now() - interval '1 minute'), false) as cooldown
      from rbc_go.email_signin_challenges
      where email = ${normalized} and created_at > now() - interval '1 hour'
    `;
    const [total] = await tx<{ count: number }[]>`
      select count(*)::integer as count from rbc_go.email_signin_challenges
      where created_at > now() - interval '1 hour'
    `;
    const key = digest(`email-otp:${clientKey}`);
    const [client] = await tx<{ count: number }[]>`
      select count(*)::integer as count from rbc_go.login_attempts
      where key_hash = ${key} and attempted_at > now() - interval '15 minutes'
    `;
    if (
      recent.cooldown ||
      recent.count >= 5 ||
      total.count >= 100 ||
      client.count >= 5
    )
      throw new AuthError("too_many_attempts");
    await tx`insert into rbc_go.login_attempts (key_hash) values (${key})`;
    await tx`update rbc_go.email_signin_challenges set consumed_at = now()
      where email = ${normalized} and consumed_at is null`;
    await tx`insert into rbc_go.email_signin_challenges
      (token_hash, email, display_name, code_hash, expires_at)
      values (${digest(token)}, ${normalized}, ${name.trim() || "Traveler"}, ${hash}, ${expires})`;
  });
  try {
    await sendTransactionalEmail({
      to: normalized,
      subject: "รหัสเข้าสู่ระบบ RBC GO / Your sign-in code",
      text: `รหัสยืนยัน / Your verification code: ${code}\n\nรหัสนี้ใช้ได้ 10 นาที ใช้ได้ครั้งเดียว และห้ามบอกรหัสแก่ผู้อื่น\nThis code expires in 10 minutes. Do not share it.\n\nหากไม่ได้ขอรหัส ให้ข้ามอีเมลนี้ / If you did not request this, ignore this email.`,
      idempotencyKey: `customer-signin/${digest(token).toString("hex")}`,
    });
  } catch {
    await sql`update rbc_go.email_signin_challenges set consumed_at = now()
      where token_hash = ${digest(token)}`;
    throw new AuthError("email_delivery_failed");
  }
  return { token, email: normalized, expires };
}

export async function verifyEmailSignIn(token: string, code: string) {
  if (!emailSignInConfigured())
    throw new AuthError("email_service_unavailable");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^\d{6}$/.test(code))
    throw new AuthError("invalid_code");
  const sql = getDb();
  const result = await sql.begin(async (tx) => {
    const [challenge] = await tx<
      {
        email: string;
        display_name: string;
        code_hash: Buffer;
        attempts: number;
      }[]
    >`select email, display_name, code_hash, attempts
      from rbc_go.email_signin_challenges
      where token_hash = ${digest(token)} and expires_at > now() and consumed_at is null
      for update`;
    if (!challenge || challenge.attempts >= 5) return { error: "code_expired" };
    await tx`update rbc_go.email_signin_challenges set attempts = attempts + 1
      where token_hash = ${digest(token)}`;
    if (
      !timingSafeEqual(
        codeHash(token, challenge.email, code),
        challenge.code_hash,
      )
    )
      return { error: "invalid_code" };
    await tx`select pg_advisory_xact_lock(hashtext(${`rbc_go:email-account:${challenge.email}`}))`;
    let [account] = await tx<{ id: string }[]>`
      select id from rbc_go.accounts where lower(email) = ${challenge.email} for update
    `;
    if (account) {
      const [identity] = await tx<{ account_id: string }[]>`
        select account_id from rbc_go.auth_identities
        where provider = 'email' and provider_subject = ${challenge.email}
          and account_id = ${account.id}
      `;
      // Do not silently link a Google or phone account by matching its email.
      if (!identity) {
        await tx`update rbc_go.email_signin_challenges set consumed_at = now()
          where token_hash = ${digest(token)}`;
        return { error: "use_existing_sign_in" };
      }
      await tx`update rbc_go.accounts set email_verified_at = coalesce(email_verified_at, now())
        where id = ${account.id}`;
    } else {
      [account] = await tx<{ id: string }[]>`
        insert into rbc_go.accounts (email, display_name, email_verified_at)
        values (${challenge.email}, ${challenge.display_name}, now()) returning id
      `;
      await tx`insert into rbc_go.auth_identities (account_id, provider, provider_subject)
        values (${account.id}, 'email', ${challenge.email})`;
    }
    await tx`update rbc_go.email_signin_challenges set consumed_at = now()
      where token_hash = ${digest(token)}`;
    return { accountId: account.id };
  });
  if (result.error) throw new AuthError(result.error);
  return result.accountId!;
}
