import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { reviewSubmittedListing } from "./actions";

type ListingRow = {
  id: string;
  title: string;
  category: string;
  description: string;
  location_text: string;
  capacity: number;
  base_price_satang: string;
  deposit_satang: string;
  business_name: string;
};

export default async function ListingReviews({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const sql = getDb();
  const [staff] = await sql<{ role: string }[]>`
    select role from rbc_go.staff_members where account_id = ${account.id}
      and role in ('admin', 'reviewer')
  `;
  if (!staff) notFound();
  const listings = await sql<ListingRow[]>`
    select listings.id, listings.title, listings.category, listings.description,
      listings.location_text, listings.capacity, listings.base_price_satang,
      listings.deposit_satang, partners.business_name
    from rbc_go.listings listings
    join rbc_go.partners partners on partners.id = listings.partner_id
    where listings.status = 'submitted'
    order by listings.created_at asc
  `;
  const images = await sql<{ listing_id: string; id: string }[]>`
    select images.listing_id, images.id from rbc_go.listing_images images
    join rbc_go.listings listings on listings.id = images.listing_id
    where listings.status = 'submitted'
    order by images.position asc
  `;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <p className="text-sm font-bold tracking-widest text-primary">
        RBC GO OPERATIONS
      </p>
      <h1 className="mt-2 text-3xl font-bold">ตรวจรายการยานพาหนะ</h1>
      <nav className="mt-4 flex gap-4 text-sm font-semibold">
        <Link
          href={`/${locale}/operations/partners`}
          className="text-primary hover:underline"
        >
          ใบสมัครพาร์ทเนอร์
        </Link>
        <span>รายการยานพาหนะ</span>
      </nav>
      <p className="mt-5 text-muted-foreground">
        {listings.length} รายการรอตรวจสอบ
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-destructive/10 p-4 text-destructive"
        >
          ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูล
        </p>
      )}
      <div className="mt-7 space-y-5">
        {listings.map((listing) => (
          <section
            key={listing.id}
            className="rounded-3xl border bg-card p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">{listing.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {listing.business_name} · {listing.category} ·{" "}
              {listing.location_text}
            </p>
            <p className="mt-3 text-sm">{listing.description}</p>
            <p className="mt-2 text-sm">
              ผู้โดยสาร {listing.capacity} คน · ราคา ฿
              {(Number(listing.base_price_satang) / 100).toLocaleString(
                "th-TH",
              )}{" "}
              · ประกัน ฿
              {(Number(listing.deposit_satang) / 100).toLocaleString("th-TH")}
            </p>
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {images
                .filter((image) => image.listing_id === listing.id)
                .map((image) => (
                  <Image
                    key={image.id}
                    src={`/api/listing-images/${image.id}`}
                    alt={listing.title}
                    width={220}
                    height={150}
                    unoptimized
                    className="h-36 w-52 shrink-0 rounded-xl object-cover"
                  />
                ))}
            </div>
            <form
              action={reviewSubmittedListing}
              className="mt-5 space-y-3 border-t pt-5"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="listingId" value={listing.id} />
              <label className="block text-sm font-semibold">
                หมายเหตุถึงพาร์ทเนอร์
                <textarea
                  name="feedback"
                  rows={3}
                  maxLength={2000}
                  className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
                  placeholder="กรอกเหตุผลเมื่อขอแก้ไข"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  name="decision"
                  value="approved"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  อนุมัติรายการ
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="changes_requested"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  ขอแก้ไข
                </button>
              </div>
            </form>
          </section>
        ))}
        {listings.length === 0 && (
          <p className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
            ไม่มีรายการรอตรวจสอบ
          </p>
        )}
      </div>
    </main>
  );
}
