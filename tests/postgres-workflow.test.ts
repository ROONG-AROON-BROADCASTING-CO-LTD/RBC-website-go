import assert from "node:assert/strict";
import { createHash, randomInt, randomUUID } from "node:crypto";
import test from "node:test";

const testUrl = process.env.RBC_GO_TEST_DATABASE_URL;

test(
  "PostgreSQL partner and listing review workflow",
  { skip: !testUrl },
  async () => {
    const url = new URL(testUrl!);
    assert.match(
      url.pathname,
      /_test$/,
      "The integration test requires a database name ending in _test",
    );
    process.env.DATABASE_URL = testUrl;

    const { getDb } = await import("../src/lib/server/db");
    const {
      savePartnerDraft,
      addPartnerDocument,
      submitPartnerApplication,
      reviewPartnerApplication,
    } = await import("../src/lib/server/partner-application");
    const {
      createPartnerListing,
      getPartnerListings,
      resubmitPartnerListing,
      reviewListing,
    } = await import("../src/lib/server/listings");
    const { listPublicListings, getPublicListing } =
      await import("../src/lib/server/public-listings");
    const { accountForGoogle } = await import("../src/lib/server/google");
    const { createEmailAccountRecord, authenticateEmail } =
      await import("../src/lib/server/auth");
    const sql = getDb();
    const unique = randomUUID();
    let ownerId: string | undefined;
    let reviewerId: string | undefined;
    let googleId: string | undefined;
    let emailId: string | undefined;
    const testEmail = `customer-${unique}@example.test`;
    try {
      const [owner] = await sql<{ id: string }[]>`
      insert into rbc_go.accounts (email, display_name)
      values (${`owner-${unique}@example.test`}, 'Test owner') returning id
    `;
      ownerId = owner.id;
      const [reviewer] = await sql<{ id: string }[]>`
      insert into rbc_go.accounts (email, display_name)
      values (${`reviewer-${unique}@example.test`}, 'Test reviewer') returning id
    `;
      reviewerId = reviewer.id;
      await sql`insert into rbc_go.staff_members (account_id, role)
      values (${reviewerId}, 'reviewer')`;

      const application = await savePartnerDraft(ownerId, "Test fleet");
      await addPartnerDocument(
        ownerId,
        "business.pdf",
        "application/pdf",
        Buffer.from("%PDF-1.4\ntest"),
      );
      await submitPartnerApplication(ownerId);
      await reviewPartnerApplication(reviewerId, application.id, "approved");

      const firstImage = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
      const secondImage = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]);
      const input = {
        category: "boats",
        title: "Test boat",
        description: "First version",
        location: "Phuket",
        capacity: "8",
        price: "1200.50",
        deposit: "300",
        images: [
          { name: "boat.png", mimeType: "image/png", bytes: firstImage },
        ],
      };
      const listingId = await createPartnerListing(ownerId, input);
      assert.equal(
        (await listPublicListings("boats")).some(
          (item) => item.id === listingId,
        ),
        false,
      );
      await reviewListing(
        reviewerId,
        listingId,
        "changes_requested",
        "Add detail",
      );
      await assert.rejects(
        resubmitPartnerListing(reviewerId, listingId, { ...input, images: [] }),
        { code: "listing_locked" },
      );
      await resubmitPartnerListing(ownerId, listingId, {
        ...input,
        title: "Updated test boat",
        images: [
          { name: "updated.png", mimeType: "image/png", bytes: secondImage },
        ],
      });
      const listings = await getPartnerListings(ownerId);
      assert.equal(listings[0].id, listingId);
      assert.equal(listings[0].title, "Updated test boat");
      assert.equal(listings[0].status, "submitted");
      const [images] = await sql<{ count: number; file_name: string }[]>`
      select count(*)::integer as count, min(file_name) as file_name
      from rbc_go.listing_images where listing_id = ${listingId}
    `;
      assert.deepEqual(images, { count: 1, file_name: "updated.png" });
      await reviewListing(
        reviewerId,
        listingId,
        "changes_requested",
        "Clarify capacity",
      );
      await resubmitPartnerListing(ownerId, listingId, {
        ...input,
        title: "Updated test boat",
        capacity: "9",
        images: [],
      });
      await reviewListing(reviewerId, listingId, "approved", "");
      assert.equal(
        (await listPublicListings("boats")).some(
          (item) => item.id === listingId,
        ),
        true,
      );
      assert.equal((await getPublicListing(listingId))?.images.length, 1);
      await sql`update rbc_go.partners set status = 'suspended'
        where owner_account_id = ${ownerId}`;
      assert.equal(await getPublicListing(listingId), null);
      assert.equal(
        (await listPublicListings("boats")).some(
          (item) => item.id === listingId,
        ),
        false,
      );
      const [approved] = await sql<{ status: string }[]>`
      select status from rbc_go.listings where id = ${listingId}
    `;
      assert.equal(approved.status, "approved");
      emailId = await createEmailAccountRecord(
        "Test email traveler",
        testEmail,
        "correct-password-123",
      );
      await assert.rejects(authenticateEmail(testEmail, "wrong-password"), {
        code: "invalid_credentials",
      });
      assert.equal(
        await authenticateEmail(testEmail, "correct-password-123"),
        emailId,
      );
      const googleSubject = `${Date.now()}${randomInt(100000, 999999)}`;
      googleId = await accountForGoogle({
        id: googleSubject,
        name: "Test Google traveler",
        email: testEmail,
      });
      assert.notEqual(googleId, emailId);
      assert.equal(
        await accountForGoogle({
          id: googleSubject,
          name: "Changed name",
          email: testEmail,
        }),
        googleId,
      );
      const [googleIdentity] = await sql<{ provider_subject: string }[]>`
        select provider_subject from rbc_go.auth_identities
        where account_id = ${googleId} and provider = 'google'
      `;
      assert.equal(googleIdentity.provider_subject, googleSubject);
    } finally {
      if (ownerId) {
        await sql`delete from rbc_go.listings where partner_id in
        (select id from rbc_go.partners where owner_account_id = ${ownerId})`;
        await sql`delete from rbc_go.partners where owner_account_id = ${ownerId}`;
        await sql`delete from rbc_go.partner_applications where owner_account_id = ${ownerId}`;
        await sql`delete from rbc_go.accounts where id = ${ownerId}`;
      }
      if (reviewerId)
        await sql`delete from rbc_go.accounts where id = ${reviewerId}`;
      if (googleId)
        await sql`delete from rbc_go.accounts where id = ${googleId}`;
      if (emailId) await sql`delete from rbc_go.accounts where id = ${emailId}`;
      const loginKey = createHash("sha256")
        .update(`login:${testEmail}`)
        .digest();
      await sql`delete from rbc_go.login_attempts where key_hash = ${loginKey}`;
      await sql.end();
    }
  },
);
