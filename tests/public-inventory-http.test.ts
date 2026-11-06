import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const databaseUrl = process.env.RBC_GO_TEST_DATABASE_URL;
const baseUrl = process.env.RBC_GO_TEST_BASE_URL;

test(
  "published inventory is public while private and suspended images stay hidden",
  { skip: !databaseUrl || !baseUrl },
  async () => {
    assert.match(new URL(databaseUrl!).pathname, /_test$/);
    process.env.DATABASE_URL = databaseUrl;
    const { getDb } = await import("../src/lib/server/db");
    const sql = getDb();
    const title = `Published test boat ${randomUUID()}`;
    let ownerId: string | undefined;
    let partnerId: string | undefined;
    try {
      const [owner] = await sql<{ id: string }[]>`
        insert into rbc_go.accounts (email, display_name)
        values (${`${randomUUID()}@example.test`}, 'HTTP test owner') returning id
      `;
      ownerId = owner.id;
      const [application] = await sql<{ id: string }[]>`
        insert into rbc_go.partner_applications
          (owner_account_id, business_name, status, submitted_at)
        values (${ownerId}, 'HTTP test fleet', 'approved', now()) returning id
      `;
      const [partner] = await sql<{ id: string }[]>`
        insert into rbc_go.partners
          (application_id, owner_account_id, business_name)
        values (${application.id}, ${ownerId}, 'HTTP test fleet') returning id
      `;
      partnerId = partner.id;
      const [published] = await sql<{ id: string }[]>`
        insert into rbc_go.listings
          (partner_id, category, title, location_text, capacity,
           base_price_satang, status)
        values (${partnerId}, 'boats', ${title}, 'Phuket', 4, 150000, 'approved')
        returning id
      `;
      const [privateListing] = await sql<{ id: string }[]>`
        insert into rbc_go.listings
          (partner_id, category, title, location_text, capacity,
           base_price_satang, status)
        values (${partnerId}, 'boats', 'Private test boat', 'Phuket', 4, 150000, 'submitted')
        returning id
      `;
      const bytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/R9sAAAAASUVORK5CYII=",
        "base64",
      );
      const insertImage = async (listingId: string) => {
        const [image] = await sql<{ id: string }[]>`
          insert into rbc_go.listing_images
            (listing_id, file_name, mime_type, byte_size, sha256, content)
          values
            (${listingId}, 'test.png', 'image/png', ${bytes.length},
             ${Buffer.alloc(32)}, ${bytes}) returning id
        `;
        return image.id;
      };
      const publicImageId = await insertImage(published.id);
      const privateImageId = await insertImage(privateListing.id);

      const search = await fetch(`${baseUrl}/en/search/boats`);
      assert.equal(search.status, 200);
      const searchHtml = await search.text();
      assert.match(searchHtml, new RegExp(title));
      assert.doesNotMatch(
        searchHtml,
        /Blue Horizon Yachts|Azimut 55|Siam Premium Cars/,
      );
      for (const path of [
        "vehicle/azimut",
        "checkout/mercedes",
        "experiences",
        "guide",
      ]) {
        const retired = await fetch(`${baseUrl}/en/${path}`);
        // Next.js keeps HTTP 200 when notFound() runs after streaming starts.
        assert.ok([200, 404].includes(retired.status));
        const retiredHtml = await retired.text();
        assert.match(retiredHtml, /404 · RBC GO/);
        assert.match(retiredHtml, /Page not found/);
        assert.doesNotMatch(
          retiredHtml,
          /Blue Horizon Yachts|Azimut 55|Siam Premium Cars/,
        );
      }
      const detail = await fetch(`${baseUrl}/en/listing/${published.id}`);
      assert.equal(detail.status, 200);
      const detailHtml = await detail.text();
      assert.match(detailHtml, new RegExp(title));
      assert.match(detailHtml, /Request a booking/);
      assert.match(detailHtml, /\/en\/email\?next=/);
      assert.equal(
        (await fetch(`${baseUrl}/api/listing-images/${publicImageId}`)).status,
        200,
      );
      assert.equal(
        (await fetch(`${baseUrl}/api/listing-images/${privateImageId}`)).status,
        404,
      );

      await sql`update rbc_go.partners set status = 'suspended'
        where id = ${partnerId}`;
      assert.equal(
        (await fetch(`${baseUrl}/api/listing-images/${publicImageId}`)).status,
        404,
      );
      assert.doesNotMatch(
        await (await fetch(`${baseUrl}/en/search/boats`)).text(),
        new RegExp(title),
      );
    } finally {
      if (partnerId)
        await sql`delete from rbc_go.listings where partner_id = ${partnerId}`;
      if (partnerId)
        await sql`delete from rbc_go.partners where id = ${partnerId}`;
      if (ownerId) {
        await sql`delete from rbc_go.partner_applications where owner_account_id = ${ownerId}`;
        await sql`delete from rbc_go.accounts where id = ${ownerId}`;
      }
      await sql.end();
    }
  },
);
