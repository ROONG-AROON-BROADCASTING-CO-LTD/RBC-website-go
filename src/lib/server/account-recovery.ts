import { randomBytes, createHash } from "node:crypto";
import { getDb } from "./db";
import { AuthError, hashPassword } from "./auth";
import { appOrigin, emailConfigurationIssues } from "@/lib/service-config";

const digest = (token: string) => createHash("sha256").update(token).digest();
export async function requestAccountLink(
  accountId: string,
  purpose: "verify" | "reset",
  locale: string,
) {
  const origin = appOrigin();
  if (!origin || emailConfigurationIssues().length)
    throw new AuthError("email_service_unavailable");
  const token = randomBytes(32).toString("base64url"),
    sql = getDb();
  await sql.begin(async (tx) => {
    const [account] = await tx<
      { email: string | null; email_verified_at: Date | null }[]
    >`select email,email_verified_at from rbc_go.accounts where id=${accountId} for update`;
    if (!account?.email) throw new AuthError("invalid_email");
    if (purpose === "verify" && account.email_verified_at) return;
    const [recent] = await tx<
      { count: number; cooldown: boolean }[]
    >`select count(*)::integer as count,
      coalesce(bool_or(created_at>now()-interval '1 minute'),false) as cooldown from rbc_go.account_tokens
      where account_id=${accountId} and purpose=${purpose} and created_at>now()-interval '1 hour'`;
    if (recent.cooldown || recent.count >= 5)
      throw new AuthError("too_many_attempts");
    await tx`update rbc_go.account_tokens set used_at=now() where account_id=${accountId} and purpose=${purpose} and used_at is null`;
    await tx`insert into rbc_go.account_tokens(token_hash,account_id,email,purpose,expires_at)
      values(${digest(token)},${accountId},${account.email},${purpose},now()+interval '30 minutes')`;
    const path = `/${["th", "en", "zh"].includes(locale) ? locale : "th"}/account-access?mode=${purpose}&token=${token}`;
    await tx`insert into rbc_go.email_outbox(dedupe_key,recipient,subject,body)
      values(${`account-${purpose}-${token}`},${account.email},${purpose === "verify" ? "RBC GO: Verify your email" : "RBC GO: Reset your password"},
      ${`Open this link to ${purpose === "verify" ? "verify your email" : "reset your password"}. The link expires in 30 minutes and can be used once.\n\n${origin}${path}\n\nIf you did not request this, ignore this email.`})`;
  });
}

export async function requestPasswordReset(email: string, locale: string) {
  if (emailConfigurationIssues().length || !appOrigin())
    throw new AuthError("email_service_unavailable");
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new AuthError("invalid_email");
  const sql = getDb();
  const [account] = await sql<
    { id: string }[]
  >`select accounts.id from rbc_go.accounts accounts
    join rbc_go.account_credentials credentials on credentials.account_id=accounts.id where lower(accounts.email)=${email}`;
  if (account)
    try {
      await requestAccountLink(account.id, "reset", locale);
    } catch (error) {
      if (!(error instanceof AuthError && error.code === "too_many_attempts"))
        throw error;
    }
}

export async function consumeAccountLink(
  token: string,
  purpose: "verify" | "reset",
  password?: string,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AuthError("code_expired");
  const encoded =
    purpose === "reset" ? await hashPassword(password ?? "") : null;
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [record] = await tx<
      { account_id: string; email: string }[]
    >`select account_id,email from rbc_go.account_tokens where token_hash=${digest(token)}
      and purpose=${purpose} and expires_at>now() and used_at is null for update`;
    if (!record) throw new AuthError("code_expired");
    const rows =
      await tx`update rbc_go.accounts set email_verified_at=now(),updated_at=now() where id=${record.account_id} and email=${record.email} returning id`;
    if (!rows.length) throw new AuthError("code_expired");
    if (purpose === "reset") {
      await tx`update rbc_go.account_credentials set password_hash=${encoded},updated_at=now() where account_id=${record.account_id}`;
      await tx`update rbc_go.user_sessions set revoked_at=now() where account_id=${record.account_id} and revoked_at is null`;
    }
    await tx`update rbc_go.account_tokens set used_at=now() where account_id=${record.account_id} and used_at is null`;
  });
}
