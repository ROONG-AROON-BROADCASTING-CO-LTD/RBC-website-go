import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  googleAuthorizationUrl,
  googleProfileFromCode,
  verifiedGoogleIdToken,
  verifiedGoogleState,
  type GoogleConfig,
} from "../src/lib/server/google";

const config: GoogleConfig = {
  clientId: "test-client.apps.googleusercontent.com",
  clientSecret: "test-secret",
  redirectUri: "https://example.test/api/auth/google/callback",
};

test("Google authorization binds redirect, state, and nonce", () => {
  const state = "a".repeat(43);
  const nonce = "b".repeat(43);
  const url = googleAuthorizationUrl(config, state, nonce);
  assert.equal(url.hostname, "accounts.google.com");
  assert.equal(url.searchParams.get("client_id"), config.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), config.redirectUri);
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("state"), state);
  assert.equal(url.searchParams.get("nonce"), nonce);
  assert.equal(url.href.includes(config.clientSecret), false);
  assert.deepEqual(verifiedGoogleState(`th.${state}.${nonce}`, state), {
    locale: "th",
    nonce,
  });
  assert.equal(
    verifiedGoogleState(`th.${state}.${nonce}`, "c".repeat(43)),
    null,
  );
});

test("Google ID token requires valid signature, audience, issuer, expiry, and nonce", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  const keyId = "test-key";
  const nonce = "n".repeat(43);
  const now = Math.floor(Date.now() / 1000);
  const token = (overrides: Record<string, unknown> = {}, key = privateKey) => {
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", kid: keyId }),
    ).toString("base64url");
    const claims = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: config.clientId,
        sub: "123456789012345678901",
        exp: now + 3600,
        iat: now,
        nonce,
        name: "Test Traveler",
        email: "test@example.com",
        email_verified: true,
        ...overrides,
      }),
    ).toString("base64url");
    const input = `${header}.${claims}`;
    return `${input}.${sign("RSA-SHA256", Buffer.from(input), key).toString("base64url")}`;
  };
  const previousFetch = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).includes("/token"))
      return Response.json({ id_token: token() });
    return Response.json({
      keys: [{ ...jwk, kid: keyId, alg: "RS256", use: "sig" }],
    });
  };
  try {
    const profile = await googleProfileFromCode(config, "test-code", nonce);
    assert.deepEqual(profile, {
      id: "123456789012345678901",
      name: "Test Traveler",
      email: "test@example.com",
    });
    assert.equal(calls[0].url, "https://oauth2.googleapis.com/token");
    assert.equal(
      (calls[0].init?.body as URLSearchParams).get("client_secret"),
      config.clientSecret,
    );
    await assert.rejects(
      verifiedGoogleIdToken(token({ aud: "wrong" }), config.clientId, nonce),
    );
    await assert.rejects(
      verifiedGoogleIdToken(
        token({ iss: "https://evil.test" }),
        config.clientId,
        nonce,
      ),
    );
    await assert.rejects(
      verifiedGoogleIdToken(token({ exp: now - 1 }), config.clientId, nonce),
    );
    await assert.rejects(
      verifiedGoogleIdToken(token({ nonce: "wrong" }), config.clientId, nonce),
    );
    const otherKey = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    }).privateKey;
    await assert.rejects(
      verifiedGoogleIdToken(token({}, otherKey), config.clientId, nonce),
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
