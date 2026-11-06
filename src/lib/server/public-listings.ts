import { getDb } from "./db";

export type PublicListing = {
  id: string;
  category: "boats" | "motorcycles" | "cars" | "jets";
  title: string;
  description: string;
  location_text: string;
  capacity: number;
  base_price_satang: string;
  deposit_satang: string;
  business_name: string;
  image_id: string | null;
};

const categories = ["boats", "motorcycles", "cars", "jets"];
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listPublicListings(
  category: string,
): Promise<PublicListing[]> {
  if (!categories.includes(category)) return [];
  const sql = getDb();
  return sql<PublicListing[]>`
    select listings.id, listings.category, listings.title,
           listings.description, listings.location_text, listings.capacity,
           listings.base_price_satang::text, listings.deposit_satang::text,
           partners.business_name, cover.id as image_id
    from rbc_go.listings listings
    join rbc_go.partners partners on partners.id = listings.partner_id
    left join lateral (
      select images.id from rbc_go.listing_images images
      where images.listing_id = listings.id
      order by images.position, images.id limit 1
    ) cover on true
    where listings.category = ${category} and listings.status = 'approved'
      and partners.status = 'active'
    order by listings.created_at desc
    limit 100
  `;
}

export async function getPublicListing(id: string) {
  if (!uuidPattern.test(id)) return null;
  const sql = getDb();
  const [listing] = await sql<PublicListing[]>`
    select listings.id, listings.category, listings.title,
           listings.description, listings.location_text, listings.capacity,
           listings.base_price_satang::text, listings.deposit_satang::text,
           partners.business_name, cover.id as image_id
    from rbc_go.listings listings
    join rbc_go.partners partners on partners.id = listings.partner_id
    left join lateral (
      select images.id from rbc_go.listing_images images
      where images.listing_id = listings.id
      order by images.position, images.id limit 1
    ) cover on true
    where listings.id = ${id} and listings.status = 'approved'
      and partners.status = 'active'
  `;
  if (!listing) return null;
  const images = await sql<{ id: string }[]>`
    select id from rbc_go.listing_images where listing_id = ${id}
    order by position, id
  `;
  return { ...listing, images: images.map((image) => image.id) };
}
