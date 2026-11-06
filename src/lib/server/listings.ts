import { createHash } from "node:crypto";
import { getDb } from "./db";

export type ListingInput = {
  category: string;
  title: string;
  description: string;
  location: string;
  capacity: string;
  price: string;
  deposit: string;
  images: { name: string; mimeType: string; bytes: Uint8Array }[];
};

export type PartnerListing = {
  id: string;
  title: string;
  category: string;
  description: string;
  location_text: string;
  capacity: number;
  base_price_satang: string;
  deposit_satang: string;
  status: string;
  feedback: string | null;
  created_at: Date;
};

export class ListingError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ListingError";
  }
}

function satang(value: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new ListingError("invalid_price");
  const [baht, cents = ""] = value.split(".");
  return Number(baht) * 100 + Number(cents.padEnd(2, "0"));
}

function verifyImage(image: ListingInput["images"][number]) {
  const name = image.name.split(/[\\/]/).pop()?.trim() ?? "";
  if (!name || name.length > 200 || /[\x00-\x1f\x7f]/.test(name)) {
    throw new ListingError("invalid_image_name");
  }
  if (!image.bytes.length || image.bytes.length > 5 * 1024 * 1024) {
    throw new ListingError("invalid_image_size");
  }
  const content = Buffer.from(image.bytes);
  const png = content
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = content[0] === 0xff && content[1] === 0xd8;
  const webp =
    content.toString("ascii", 0, 4) === "RIFF" &&
    content.toString("ascii", 8, 12) === "WEBP";
  if (!(
    (image.mimeType === "image/png" && png) ||
    (image.mimeType === "image/jpeg" && jpeg) ||
    (image.mimeType === "image/webp" && webp)
  )) {
    throw new ListingError("invalid_image_type");
  }
  return {
    name,
    content,
    sha256: createHash("sha256").update(content).digest(),
  };
}

export async function getActivePartner(accountId: string) {
  const sql = getDb();
  const [partner] = await sql<{ id: string; business_name: string }[]>`
    select partners.id, partners.business_name
    from rbc_go.partner_members members
    join rbc_go.partners partners on partners.id = members.partner_id
    where members.account_id = ${accountId} and partners.status = 'active'
  `;
  return partner ?? null;
}

export async function getPartnerListings(accountId: string) {
  const sql = getDb();
  return sql<PartnerListing[]>`
    select listings.id, listings.title, listings.category, listings.description,
           listings.location_text, listings.capacity, listings.base_price_satang,
           listings.deposit_satang, listings.status, listings.feedback, listings.created_at
    from rbc_go.listings listings
    join rbc_go.partner_members members on members.partner_id = listings.partner_id
    where members.account_id = ${accountId}
    order by listings.created_at desc
  `;
}

export async function createPartnerListing(
  accountId: string,
  input: ListingInput,
) {
  if (!["boats", "motorcycles", "cars", "jets"].includes(input.category))
    throw new ListingError("invalid_category");
  const title = input.title.trim();
  const location = input.location.trim();
  const description = input.description.trim();
  const capacity = Number(input.capacity);
  if (title.length < 2 || title.length > 200)
    throw new ListingError("invalid_title");
  if (!location || location.length > 200 || description.length > 5000)
    throw new ListingError("invalid_description");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200)
    throw new ListingError("invalid_capacity");
  const price = satang(input.price);
  const deposit = satang(input.deposit || "0");
  if (price === 0) throw new ListingError("invalid_price");
  if (input.images.length < 1 || input.images.length > 5)
    throw new ListingError("images_required");
  if (
    input.images.reduce((total, image) => total + image.bytes.length, 0) >
    10 * 1024 * 1024
  ) {
    throw new ListingError("images_too_large");
  }
  const images = input.images.map(verifyImage);
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [member] = await tx<{ partner_id: string }[]>`
      select members.partner_id from rbc_go.partner_members members
      join rbc_go.partners partners on partners.id = members.partner_id
      where members.account_id = ${accountId} and partners.status = 'active'
        and members.role in ('owner', 'editor')
    `;
    if (!member) throw new ListingError("forbidden");
    const [listing] = await tx<{ id: string }[]>`
      insert into rbc_go.listings
        (partner_id, category, title, description, location_text, capacity,
         base_price_satang, deposit_satang, status)
      values
        (${member.partner_id}, ${input.category}, ${title}, ${description}, ${location},
         ${capacity}, ${price}, ${deposit}, 'submitted')
      returning id
    `;
    for (const [position, image] of images.entries()) {
      await tx`
        insert into rbc_go.listing_images
          (listing_id, file_name, mime_type, byte_size, sha256, content, position)
        values
          (${listing.id}, ${image.name}, ${input.images[position].mimeType},
           ${image.content.length}, ${image.sha256}, ${image.content}, ${position})
      `;
    }
    return listing.id;
  });
}

export async function resubmitPartnerListing(
  accountId: string,
  listingId: string,
  input: ListingInput,
) {
  if (!/^[0-9a-f-]{36}$/i.test(listingId))
    throw new ListingError("invalid_listing");
  if (!["boats", "motorcycles", "cars", "jets"].includes(input.category))
    throw new ListingError("invalid_category");
  const title = input.title.trim();
  const location = input.location.trim();
  const description = input.description.trim();
  const capacity = Number(input.capacity);
  if (title.length < 2 || title.length > 200)
    throw new ListingError("invalid_title");
  if (!location || location.length > 200 || description.length > 5000)
    throw new ListingError("invalid_description");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200)
    throw new ListingError("invalid_capacity");
  const price = satang(input.price);
  const deposit = satang(input.deposit || "0");
  if (price === 0) throw new ListingError("invalid_price");
  if (
    input.images.length > 5 ||
    input.images.reduce((total, image) => total + image.bytes.length, 0) >
      10 * 1024 * 1024
  )
    throw new ListingError("images_too_large");
  const images = input.images.map(verifyImage);
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [listing] = await tx<{ id: string }[]>`
      select listings.id from rbc_go.listings listings
      join rbc_go.partners partners on partners.id = listings.partner_id
      join rbc_go.partner_members members on members.partner_id = partners.id
      where listings.id = ${listingId} and listings.status = 'changes_requested'
        and partners.status = 'active' and members.account_id = ${accountId}
        and members.role in ('owner', 'editor')
      for update of listings
    `;
    if (!listing) throw new ListingError("listing_locked");
    if (!images.length) {
      const [existing] = await tx<{ count: number }[]>`
        select count(*)::integer as count from rbc_go.listing_images
        where listing_id = ${listingId}
      `;
      if (!existing.count) throw new ListingError("images_required");
    }
    await tx`
      update rbc_go.listings set category = ${input.category}, title = ${title},
        description = ${description}, location_text = ${location}, capacity = ${capacity},
        base_price_satang = ${price}, deposit_satang = ${deposit},
        status = 'submitted', feedback = null, updated_at = now()
      where id = ${listingId}
    `;
    if (images.length) {
      await tx`delete from rbc_go.listing_images where listing_id = ${listingId}`;
      for (const [position, image] of images.entries()) {
        await tx`
          insert into rbc_go.listing_images
            (listing_id, file_name, mime_type, byte_size, sha256, content, position)
          values
            (${listingId}, ${image.name}, ${input.images[position].mimeType},
             ${image.content.length}, ${image.sha256}, ${image.content}, ${position})
        `;
      }
    }
    return listingId;
  });
}

export async function reviewListing(
  reviewerAccountId: string,
  listingId: string,
  decision: "approved" | "changes_requested",
  feedback: string,
) {
  if (
    feedback.length > 2000 ||
    (decision === "changes_requested" && !feedback.trim())
  ) {
    throw new ListingError("invalid_feedback");
  }
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [staff] = await tx<{ role: string }[]>`
      select role from rbc_go.staff_members
      where account_id = ${reviewerAccountId} and role in ('admin', 'reviewer')
    `;
    if (!staff) throw new ListingError("forbidden");
    const [listing] = await tx<{ id: string }[]>`
      select id from rbc_go.listings where id = ${listingId} and status = 'submitted' for update
    `;
    if (!listing) throw new ListingError("listing_locked");
    await tx`
      update rbc_go.listings set status = ${decision}, feedback = ${feedback.trim() || null},
        updated_at = now() where id = ${listing.id}
    `;
  });
}
