import { createPublicKey, timingSafeEqual, verify } from "node:crypto";
import type { JsonWebKey as CryptoJsonWebKey } from "node:crypto";
import { getDb } from "./db";

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function googleConfig(): GoogleConfig | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)
    return null;
  let redirect: URL;
  try {
    redirect = new URL(GOOGLE_REDIRECT_URI);
  } catch {
    return null;
  }
  if (
    redirect.pathname !== "/api/auth/google/callback" ||
    redirect.search ||
    redirect.hash ||
    (redirect.protocol !== "https:" &&
      !(redirect.protocol === "http:" && redirect.hostname === "localhost"))
  )
    return null;
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: redirect.toString(),
  };
}

export function googleAuthorizationUrl(
  config: GoogleConfig,
  state: string,
  nonce: string,
) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url;
}

export function verifiedGoogleState(saved: string, received: string) {
  const match = saved.match(
    /^(th|en|zh)\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/,
  );
  if (!match || !/^[A-Za-z0-9_-]{43}$/.test(received)) return null;
  if (!timingSafeEqual(Buffer.from(match[2]), Buffer.from(received)))
    return null;
  return { locale: match[1] as "th" | "en" | "zh", nonce: match[3] };
}

type GoogleClaims = {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
  name?: unknown;
  email?: unknown;
  email_verified?: unknown;
};

const jwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
type GoogleJwk = CryptoJsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
  kty?: string;
};
let cachedKeys: { keys: GoogleJwk[]; until: number } | null = null;

async function googleKeys(refresh = false) {
  if (!refresh && cachedKeys && cachedKeys.until > Date.now())
    return cachedKeys.keys;
  const response = await fetch(jwksUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("google_keys_unavailable");
  const data = (await response.json()) as { keys?: unknown };
  if (!Array.isArray(data.keys)) throw new Error("google_keys_invalid");
  const keys = data.keys as GoogleJwk[];
  cachedKeys = { keys, until: Date.now() + 15 * 60 * 1000 };
  return keys;
}

export async function verifiedGoogleIdToken(
  idToken: string,
  clientId: string,
  nonce: string,
) {
  if (idToken.length > 16000) throw new Error("google_token_invalid");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("google_token_invalid");
  let header: { alg?: unknown; kid?: unknown };
  let claims: GoogleClaims;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    throw new Error("google_token_invalid");
  }
  if (
    header.alg !== "RS256" ||
    typeof header.kid !== "string" ||
    header.kid.length > 256
  )
    throw new Error("google_token_invalid");
  let keys = await googleKeys();
  let key = keys.find(
    (candidate) =>
      candidate.kid === header.kid &&
      candidate.kty === "RSA" &&
      candidate.use === "sig" &&
      candidate.alg === "RS256",
  );
  if (!key) {
    keys = await googleKeys(true);
    key = keys.find(
      (candidate) =>
        candidate.kid === header.kid &&
        candidate.kty === "RSA" &&
        candidate.use === "sig" &&
        candidate.alg === "RS256",
    );
  }
  if (!key) throw new Error("google_key_missing");
  let signatureValid = false;
  try {
    signatureValid = verify(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(parts[2], "base64url"),
    );
  } catch {
    throw new Error("google_token_invalid");
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    !signatureValid ||
    (claims.iss !== "https://accounts.google.com" &&
      claims.iss !== "accounts.google.com") ||
    claims.aud !== clientId ||
    typeof claims.sub !== "string" ||
    !/^[0-9]{1,255}$/.test(claims.sub) ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60 ||
    claims.nonce !== nonce
  )
    throw new Error("google_token_invalid");
  return {
    id: claims.sub,
    name:
      typeof claims.name === "string" && claims.name.trim()
        ? claims.name.trim().slice(0, 120)
        : "Google user",
    email:
      claims.email_verified === true && typeof claims.email === "string"
        ? claims.email.trim().toLowerCase().slice(0, 254)
        : null,
  };
}

export async function googleProfileFromCode(
  config: GoogleConfig,
  code: string,
  nonce: string,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("google_token_exchange_failed");
  const token = (await response.json()) as { id_token?: unknown };
  if (typeof token.id_token !== "string")
    throw new Error("google_token_missing");
  return verifiedGoogleIdToken(token.id_token, config.clientId, nonce);
}

export async function accountForGoogle(profile: {
  id: string;
  name: string;
  email: string | null;
}) {
  const sql = getDb();
  const findExisting = async () => {
    const [identity] = await sql<{ account_id: string }[]>`
      select account_id from rbc_go.auth_identities
      where provider = 'google' and provider_subject = ${profile.id}
    `;
    return identity?.account_id;
  };
  const existing = await findExisting();
  if (existing) return existing;
  try {
    return await sql.begin(async (tx) => {
      // A matching email alone never links a different account.
      const [account] = await tx<{ id: string }[]>`
        insert into rbc_go.accounts (display_name)
        values (${profile.name}) returning id
      `;
      await tx`
        insert into rbc_go.auth_identities
          (account_id, provider, provider_subject)
        values (${account.id}, 'google', ${profile.id})
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
      const raced = await findExisting();
      if (raced) return raced;
    }
    throw error;
  }
}
