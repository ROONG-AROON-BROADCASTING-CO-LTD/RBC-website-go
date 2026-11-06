import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";

const databaseUrl = process.env.RBC_GO_TEST_DATABASE_URL;
const baseUrl = process.env.RBC_GO_TEST_BASE_URL;

function actionFields(html: string) {
  const form = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/)?.[1];
  assert.ok(form, "A server action form is rendered");
  const fields = new FormData();
  for (const [tag] of form.matchAll(/<input\b[^>]*>/g)) {
    const name = tag.match(/\bname="([^"]+)"/)?.[1];
    if (!name?.startsWith("$ACTION_")) continue;
    const value = tag.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
    fields.set(name, value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  }
  assert.ok([...fields.keys()].length);
  return fields;
}

test(
  "admin entrance checks staff access before creating a session and routes each role correctly",
  {
    skip: !databaseUrl || !baseUrl,
  },
  async () => {
    assert.match(new URL(databaseUrl!).pathname, /_test$/);
    assert.equal(new URL(baseUrl!).hostname, "localhost");
    process.env.DATABASE_URL = databaseUrl;
    const { getDb } = await import("../src/lib/server/db");
    const { createEmailAccountRecord, createSessionRecord } =
      await import("../src/lib/server/auth");
    const sql = getDb();
    const password = "staff-test-password-12345";
    const accounts: { id: string; email: string; role: string }[] = [];
    const loginUrl = `${baseUrl}/admin?lang=en`;
    async function login(
      email: string,
      suppliedPassword: string,
      cookie?: string,
    ) {
      const page = await fetch(loginUrl, {
        headers: cookie ? { Cookie: cookie } : {},
      });
      const body = actionFields(await page.text());
      body.set("locale", "en");
      body.set("email", email);
      body.set("password", suppliedPassword);
      body.set("next", "https://example.test/untrusted");
      return fetch(loginUrl, {
        method: "POST",
        body,
        headers: {
          Origin: baseUrl!,
          Referer: loginUrl,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        redirect: "manual",
      });
    }
    try {
      const page = await fetch(loginUrl);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /Staff sign in/);
      assert.doesNotMatch(html, /aria-label="Main navigation"/);
      assert.doesNotMatch(html, /href="\/en\/partner-signup"/);
      for (const role of ["customer", "admin", "reviewer", "support"]) {
        const email = `staff-${role}-${randomUUID()}@example.test`;
        const id = await createEmailAccountRecord(
          `Staff test ${role}`,
          email,
          password,
        );
        accounts.push({ id, email, role });
        if (role !== "customer")
          await sql`insert into rbc_go.staff_members (account_id, role) values (${id}, ${role})`;
      }
      const customer = accounts[0];
      const existingSession = await createSessionRecord(customer.id);
      const customerCookie = `rbc_go_session=${existingSession.token}`;
      const denied = await login(customer.email, password, customerCookie);
      assert.equal(
        denied.headers
          .getSetCookie()
          .some((value) => value.startsWith("rbc_go_session=")),
        false,
      );
      assert.match(
        await denied.text(),
        /This account does not have staff access/,
      );
      const [sessionCount] = await sql<
        { count: number }[]
      >`select count(*)::integer as count from rbc_go.user_sessions where account_id = ${customer.id}`;
      assert.equal(
        sessionCount.count,
        1,
        "Denied staff login keeps the existing customer session",
      );
      const [membershipCount] = await sql<
        { count: number }[]
      >`select count(*)::integer as count from rbc_go.staff_members where account_id = ${customer.id}`;
      assert.equal(
        membershipCount.count,
        0,
        "Login never provisions staff access",
      );

      const wrongPassword = await login(accounts[1].email, "wrong-password");
      assert.equal(
        wrongPassword.headers
          .getSetCookie()
          .some((value) => value.startsWith("rbc_go_session=")),
        false,
      );
      assert.match(
        await wrongPassword.text(),
        /Email or password is incorrect/,
      );
      for (const account of accounts.slice(1)) {
        const response = await login(account.email, password);
        const cookie = response.headers
          .getSetCookie()
          .find((value) => value.startsWith("rbc_go_session="))
          ?.split(";")[0];
        assert.ok(cookie, `${account.role} receives a session`);
        const path = `/en/operations/${account.role === "support" ? "payments" : "partners"}`;
        assert.equal(response.status, 303);
        assert.equal(response.headers.get("location"), path);
        const workspace = await fetch(baseUrl + path, {
          headers: { Cookie: cookie },
        });
        assert.equal(workspace.status, 200);
        const workspaceHtml = await workspace.text();
        assert.match(workspaceHtml, /RBC GO TEAM/);
        assert.doesNotMatch(workspaceHtml, /aria-label="Main navigation"/);
        if (account.role === "support") {
          const blocked = await fetch(`${baseUrl}/en/operations/partners`, {
            headers: { Cookie: cookie },
          });
          assert.ok(
            blocked.status === 404 ||
              (await blocked.text()).includes("NEXT_HTTP_ERROR_FALLBACK;404"),
          );
        }
        const logoutBody = actionFields(workspaceHtml);
        logoutBody.set("locale", "en");
        const logout = await fetch(baseUrl + path, {
          method: "POST",
          body: logoutBody,
          headers: {
            Cookie: cookie,
            Origin: baseUrl!,
            Referer: baseUrl + path,
          },
          redirect: "manual",
        });
        assert.equal(logout.status, 303);
        assert.equal(logout.headers.get("location"), "/admin?lang=en");
        const token = cookie.slice("rbc_go_session=".length);
        const hash = createHash("sha256").update(token).digest();
        const [session] = await sql<
          { revoked_at: Date | null }[]
        >`select revoked_at from rbc_go.user_sessions where token_hash = ${hash}`;
        assert.ok(session.revoked_at, "Staff logout revokes the session");
      }
      const reviewer = accounts.find((account) => account.role === "reviewer")!;
      const session = await createSessionRecord(reviewer.id);
      await sql`delete from rbc_go.staff_members where account_id = ${reviewer.id}`;
      const blocked = await fetch(`${baseUrl}/en/operations/partners`, {
        headers: { Cookie: `rbc_go_session=${session.token}` },
      });
      const blockedHtml = await blocked.text();
      assert.doesNotMatch(blockedHtml, /No applications awaiting review/);
      assert.match(blockedHtml, /Staff sign in|\/admin\?lang=en/);
    } finally {
      for (const account of accounts) {
        await sql`delete from rbc_go.accounts where id = ${account.id}`;
        const key = createHash("sha256")
          .update(`login:${account.email}`)
          .digest();
        await sql`delete from rbc_go.login_attempts where key_hash = ${key}`;
      }
      await sql.end();
    }
  },
);
