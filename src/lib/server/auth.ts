import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const sessionCookieName = "rbc_go_session";
const sessionDays = 7;
const hashOptions = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derivePassword(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, hashOptions, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export class AuthError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AuthError";
  }
}

function emailKey(email: string) {
  return email.trim().toLowerCase();
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest();
}

async function hashPassword(password: string) {
  const salt = randomBytes(24);
  const derived = await derivePassword(password, salt);
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, salt, expected] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    n !== "32768" ||
    r !== "8" ||
    p !== "1" ||
    !salt ||
    !expected
  ) {
    return false;
  }
  const expectedBytes = Buffer.from(expected, "base64url");
  if (expectedBytes.length !== 64) return false;
  const actual = await derivePassword(password, Buffer.from(salt, "base64url"));
  return timingSafeEqual(actual, expectedBytes);
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSessionRecord(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + sessionDays * 86400000);
  const sql = getDb();
  await sql`
    insert into rbc_go.user_sessions (token_hash, account_id, expires_at)
    values (${tokenHash(token)}, ${accountId}, ${expires})
  `;
  return { token, expires };
}

async function createSession(accountId: string) {
  const { token, expires } = await createSessionRecord(accountId);
  (await cookies()).set(
    sessionCookieName,
    token,
    sessionCookieOptions(expires),
  );
}

export async function createEmailAccountRecord(
  name: string,
  email: string,
  password: string,
) {
  const { normalizedName, normalizedEmail, passwordHash } =
    await prepareEmailRegistration(name, email, password);
  const sql = getDb();
  let accountId: string;
  try {
    accountId = await sql.begin(async (tx) => {
      const [account] = await tx<{ id: string }[]>`
        insert into rbc_go.accounts (email, display_name)
        values (${normalizedEmail}, ${normalizedName}) returning id
      `;
      await tx`
        insert into rbc_go.account_credentials (account_id, password_hash)
        values (${account.id}, ${passwordHash})
      `;
      await tx`
        insert into rbc_go.auth_identities (account_id, provider, provider_subject)
        values (${account.id}, 'email', ${normalizedEmail})
      `;
      return account.id;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AuthError("email_in_use");
    }
    throw error;
  }
  return accountId;
}

export async function prepareEmailRegistration(
  name: string,
  email: string,
  password: string,
) {
  const normalizedName = name.trim();
  const normalizedEmail = emailKey(email);
  if (normalizedName.length < 2 || normalizedName.length > 120)
    throw new AuthError("invalid_name");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254
  ) {
    throw new AuthError("invalid_email");
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 256) {
    throw new AuthError("invalid_password");
  }
  const passwordHash = await hashPassword(password);
  return { normalizedName, normalizedEmail, passwordHash };
}

export async function registerEmailAccount(
  name: string,
  email: string,
  password: string,
) {
  const accountId = await createEmailAccountRecord(name, email, password);
  await createSession(accountId);
}

export async function authenticateEmail(email: string, password: string) {
  const normalizedEmail = emailKey(email);
  if (!normalizedEmail || password.length > 256)
    throw new AuthError("invalid_credentials");
  const sql = getDb();
  const keyHash = tokenHash(`login:${normalizedEmail}`);
  const [attempts] = await sql<{ count: number }[]>`
    select count(*)::integer as count from rbc_go.login_attempts
    where key_hash = ${keyHash} and attempted_at > now() - interval '15 minutes'
      and succeeded = false
  `;
  if (attempts.count >= 5) throw new AuthError("too_many_attempts");
  const [account] = await sql<{ id: string; password_hash: string }[]>`
    select accounts.id, credentials.password_hash
    from rbc_go.accounts accounts
    join rbc_go.account_credentials credentials on credentials.account_id = accounts.id
    where lower(accounts.email) = ${normalizedEmail}
  `;
  const valid = account
    ? await verifyPassword(password, account.password_hash)
    : false;
  await sql`
    insert into rbc_go.login_attempts (key_hash, succeeded)
    values (${keyHash}, ${valid})
  `;
  if (!valid) throw new AuthError("invalid_credentials");
  return account.id;
}

export async function loginEmailAccount(email: string, password: string) {
  const accountId = await authenticateEmail(email, password);
  await createSession(accountId);
}

export async function currentAccount() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sql = getDb();
  const [account] = await sql<
    {
      id: string;
      email: string | null;
      display_name: string;
      auth_provider: string;
      traveler_name: string | null;
      traveler_email: string | null;
      traveler_phone: string | null;
    }[]
  >`
    select accounts.id, accounts.email, accounts.display_name,
      profiles.full_name as traveler_name,
      profiles.contact_email as traveler_email,
      profiles.contact_phone as traveler_phone,
      coalesce((select provider from rbc_go.auth_identities identities
        where identities.account_id = accounts.id
        order by identities.created_at limit 1), 'email') as auth_provider
    from rbc_go.user_sessions sessions
    join rbc_go.accounts accounts on accounts.id = sessions.account_id
    left join rbc_go.customer_profiles profiles on profiles.account_id = accounts.id
    where sessions.token_hash = ${tokenHash(token)}
      and sessions.revoked_at is null and sessions.expires_at > now()
  `;
  return account ?? null;
}

export {
  registerEmailAccount as registerPartnerAccount,
  loginEmailAccount as loginPartnerAccount,
};

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    const sql = getDb();
    await sql`update rbc_go.user_sessions set revoked_at = now()
      where token_hash = ${tokenHash(token)} and revoked_at is null`;
  }
  cookieStore.delete(sessionCookieName);
}
