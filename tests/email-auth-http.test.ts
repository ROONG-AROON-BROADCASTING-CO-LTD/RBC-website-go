import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";

const databaseUrl = process.env.RBC_GO_TEST_DATABASE_URL;
const baseUrl = process.env.RBC_GO_TEST_BASE_URL;

function actionFields(html: string) {
  const fields = new URLSearchParams();
  for (const [tag] of html.matchAll(/<input\b[^>]*>/g)) {
    const name = tag.match(/\bname="([^"]+)"/)?.[1];
    if (!name?.startsWith("$ACTION_")) continue;
    const value = tag.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
    fields.set(name, value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  }
  assert.ok([...fields.keys()].some((name) => name.startsWith("$ACTION_REF_")));
  return fields;
}

async function submit(
  url: string,
  fields: URLSearchParams,
  values: Record<string, string>,
) {
  for (const [key, value] of Object.entries(values)) fields.set(key, value);
  const body = new FormData();
  for (const [key, value] of fields) body.append(key, value);
  return fetch(url, {
    method: "POST",
    body,
    headers: { Origin: new URL(url).origin, Referer: url },
    redirect: "manual",
  });
}

test(
  "customer email register and login set a server session",
  { skip: !databaseUrl || !baseUrl },
  async () => {
    assert.match(new URL(databaseUrl!).pathname, /_test$/);
    assert.equal(new URL(baseUrl!).hostname, "localhost");
    process.env.DATABASE_URL = databaseUrl;
    const { getDb } = await import("../src/lib/server/db");
    const sql = getDb();
    const email = `email-${randomUUID()}@example.test`;
    const name = "Email HTTP Traveler";
    const password = "test-password-12345";
    try {
      const registrationUrl = `${baseUrl}/en/email?mode=register`;
      const registrationPage = await fetch(registrationUrl);
      assert.equal(registrationPage.status, 200);
      const registration = await submit(
        registrationUrl,
        actionFields(await registrationPage.text()),
        { locale: "en", mode: "register", name, email, password },
      );
      const registerCookie = registration.headers
        .getSetCookie()
        .find((value) => value.startsWith("rbc_go_session="));
      const registrationBody = await registration.text();
      const [created] = await sql<{ count: number }[]>`
        select count(*)::integer as count from rbc_go.accounts where email = ${email}
      `;
      assert.ok(
        registerCookie,
        `Registration returned ${registration.status}, account count ${created.count}, redirect ${registrationBody.match(/__next-page-redirect[^>]+/)?.[0] ?? "none"}, alerts ${registrationBody.match(/role="alert"[^>]*>[^<]*/g)?.join(" | ") ?? "none"}`,
      );

      const profile = await fetch(`${baseUrl}/en/account/profile`, {
        headers: { Cookie: registerCookie.split(";")[0] },
      });
      assert.equal(profile.status, 200);
      assert.match(await profile.text(), new RegExp(name));

      const loginUrl = `${baseUrl}/en/email?mode=login`;
      const loginPage = await fetch(loginUrl);
      const login = await submit(
        loginUrl,
        actionFields(await loginPage.text()),
        { locale: "en", mode: "login", email, password },
      );
      assert.ok(
        login.headers
          .getSetCookie()
          .some((value) => value.startsWith("rbc_go_session=")),
        `Login returned ${login.status}`,
      );
    } finally {
      await sql`delete from rbc_go.accounts where email = ${email}`;
      const loginKey = createHash("sha256").update(`login:${email}`).digest();
      await sql`delete from rbc_go.login_attempts where key_hash = ${loginKey}`;
      await sql.end();
    }
  },
);
