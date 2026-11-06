import { randomBytes, createHash } from "node:crypto";
import { getDb } from "./db";
import { AuthError } from "./auth";

export function smsConfigured() {
  return Boolean(
    /^SK[0-9a-f]{32}$/i.test(process.env.TWILIO_API_KEY ?? "") &&
    process.env.TWILIO_API_SECRET &&
    /^VA[0-9a-f]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID ?? ""),
  );
}
const digest = (value: string) => createHash("sha256").update(value).digest();
async function verifyRequest(path: string, body: URLSearchParams) {
  if (!smsConfigured()) throw new AuthError("sms_unavailable");
  let response: Response;
  try {
    response = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_API_KEY}:${process.env.TWILIO_API_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new AuthError("sms_unavailable");
  }
  if (response.status === 429) throw new AuthError("too_many_attempts");
  if (response.status === 404) throw new AuthError("code_expired");
  if (!response.ok) throw new AuthError("sms_unavailable");
  return (await response.json()) as { status: string; to: string };
}

export async function beginPhoneChallenge(
  name: string,
  phone: string,
  clientKey: string,
) {
  if (!smsConfigured()) throw new AuthError("sms_unavailable");
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone) || name.trim().length > 120)
    throw new AuthError("invalid_phone");
  const token = randomBytes(32).toString("base64url"),
    expires = new Date(Date.now() + 600000),
    sql = getDb();
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('rbc_go:sms-rate-limit'))`;
    const [recent] = await tx<
      { count: number; cooldown: boolean }[]
    >`select count(*)::integer as count,coalesce(bool_or(created_at>now()-interval '1 minute'),false) as cooldown
      from rbc_go.phone_challenges where phone_e164=${phone} and created_at>now()-interval '1 hour'`;
    const [global] = await tx<
      { count: number }[]
    >`select count(*)::integer as count from rbc_go.phone_challenges where created_at>now()-interval '1 hour'`;
    const key = digest(`sms:${clientKey}`);
    const [client] = await tx<
      { count: number }[]
    >`select count(*)::integer as count from rbc_go.login_attempts where key_hash=${key} and attempted_at>now()-interval '15 minutes'`;
    if (
      recent.cooldown ||
      recent.count >= 5 ||
      global.count >= 100 ||
      client.count >= 5
    )
      throw new AuthError("too_many_attempts");
    await tx`insert into rbc_go.login_attempts(key_hash) values(${key})`;
    await tx`insert into rbc_go.phone_challenges(token_hash,phone_e164,display_name,expires_at) values(${digest(token)},${phone},${name.trim() || "Traveler"},${expires})`;
  });
  const result = await verifyRequest(
    "Verifications",
    new URLSearchParams({ To: phone, Channel: "sms" }),
  );
  if (result.status !== "pending" || result.to !== phone)
    throw new AuthError("sms_unavailable");
  return { token, phone, expires };
}

export async function verifyPhoneChallenge(token: string, code: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^\d{6}$/.test(code))
    throw new AuthError("invalid_code");
  const sql = getDb();
  const result = await sql.begin(async (tx) => {
    const [challenge] = await tx<
      { phone_e164: string; display_name: string; attempts: number }[]
    >`select phone_e164,display_name,attempts from rbc_go.phone_challenges
      where token_hash=${digest(token)} and expires_at>now() and consumed_at is null for update`;
    if (!challenge || challenge.attempts >= 5) return { error: "code_expired" };
    await tx`update rbc_go.phone_challenges set attempts=attempts+1 where token_hash=${digest(token)}`;
    let verification;
    try {
      verification = await verifyRequest(
        "VerificationCheck",
        new URLSearchParams({ To: challenge.phone_e164, Code: code }),
      );
    } catch (error) {
      return {
        error: error instanceof AuthError ? error.code : "sms_unavailable",
      };
    }
    if (
      verification.status !== "approved" ||
      verification.to !== challenge.phone_e164
    )
      return { error: "invalid_code" };
    const [account] = await tx<
      { id: string }[]
    >`insert into rbc_go.accounts(phone_e164,display_name,phone_verified_at)
      values(${challenge.phone_e164},${challenge.display_name},now())
      on conflict(phone_e164) where phone_e164 is not null do update set phone_verified_at=coalesce(accounts.phone_verified_at,now()) returning id`;
    await tx`insert into rbc_go.auth_identities(account_id,provider,provider_subject) values(${account.id},'phone',${challenge.phone_e164}) on conflict do nothing`;
    await tx`update rbc_go.phone_challenges set consumed_at=now() where token_hash=${digest(token)}`;
    return { accountId: account.id };
  });
  if (result.error) throw new AuthError(result.error);
  return result.accountId!;
}
