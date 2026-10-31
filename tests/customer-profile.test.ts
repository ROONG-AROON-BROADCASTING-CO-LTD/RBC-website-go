import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const testUrl = process.env.RBC_GO_TEST_DATABASE_URL;

test(
  "customer details persist per account in PostgreSQL",
  { skip: !testUrl },
  async () => {
    assert.match(new URL(testUrl!).pathname, /_test$/);
    process.env.DATABASE_URL = testUrl;
    const { getDb } = await import("../src/lib/server/db");
    const { saveCustomerProfileRecord, CustomerProfileError } =
      await import("../src/lib/server/customer-profile");
    const sql = getDb();
    const unique = randomUUID();
    const ids: string[] = [];
    try {
      for (const number of [1, 2]) {
        const [account] = await sql<{ id: string }[]>`
        insert into rbc_go.accounts (email, display_name)
        values (${`profile-${number}-${unique}@example.test`}, 'Test customer')
        returning id
      `;
        ids.push(account.id);
      }
      await saveCustomerProfileRecord(ids[0], {
        name: " First Customer ",
        email: " FIRST@example.test ",
        phone: "081 234 5678",
      });
      const profiles = await sql<
        { account_id: string; full_name: string; contact_email: string }[]
      >`
      select account_id, full_name, contact_email
      from rbc_go.customer_profiles
      where account_id in (${ids[0]}, ${ids[1]})
    `;
      assert.equal(profiles.length, 1);
      assert.equal(profiles[0].account_id, ids[0]);
      assert.equal(profiles[0].full_name, "First Customer");
      assert.equal(profiles[0].contact_email, "first@example.test");
      await assert.rejects(
        saveCustomerProfileRecord(ids[1], {
          name: "Second Customer",
          email: "invalid",
          phone: "0812345678",
        }),
        CustomerProfileError,
      );
      const [other] = await sql<{ count: number }[]>`
      select count(*)::int as count from rbc_go.customer_profiles
      where account_id = ${ids[1]}
    `;
      assert.equal(other.count, 0);
    } finally {
      if (ids.length === 2)
        await sql`delete from rbc_go.accounts where id = ${ids[0]} or id = ${ids[1]}`;
      else if (ids.length === 1)
        await sql`delete from rbc_go.accounts where id = ${ids[0]}`;
    }
  },
);
