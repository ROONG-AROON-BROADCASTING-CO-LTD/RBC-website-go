import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/components/partner/listing-form";
import { currentAccount } from "@/lib/server/auth";
import { getActivePartner, getPartnerListings } from "@/lib/server/listings";
import { listPartnerBookingRequests } from "@/lib/server/partner-bookings";
import { respondToBooking } from "./booking-actions";

export default async function PartnerOverview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bookingError?: string }>;
}) {
  const { locale } = await params;
  const { bookingError } = await searchParams;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const [partner, listings, bookings] = await Promise.all([
    getActivePartner(account.id),
    getPartnerListings(account.id),
    listPartnerBookingRequests(account.id),
  ]);
  if (!partner) redirect(`/${locale}/apply`);
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <p className="text-sm font-bold tracking-widest text-primary">
        RBC GO PARTNERS
      </p>
      <h1 className="mt-2 text-3xl font-bold">{partner.business_name}</h1>
      <p className="mt-2 text-muted-foreground">จัดการรายการยานพาหนะของคุณ</p>
      <section className="mt-8 rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-bold">คำขอจอง ({bookings.length})</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ตรวจสอบวันว่างแล้วเสนอราคาสุทธิให้ลูกค้า ก่อนให้ลูกค้าชำระผ่าน Omise
        </p>
        {bookingError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {bookingError === "dates_unavailable"
              ? "ช่วงเวลานี้มีการจองหรือถูกปิดแล้ว"
              : bookingError === "invalid_price"
                ? "กรุณากรอกราคาสุทธิให้ถูกต้อง"
                : "ดำเนินการกับคำขอนี้ไม่ได้ กรุณาโหลดหน้าใหม่"}
          </p>
        )}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{booking.title}</h3>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {booking.status}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {booking.traveler_snapshot.name} ·{" "}
                {booking.traveler_snapshot.guests} คน
              </p>
              <p className="text-sm">
                {booking.traveler_snapshot.email}
                {booking.traveler_snapshot.phone &&
                  ` · ${booking.traveler_snapshot.phone}`}
              </p>
              <p className="mt-2 text-sm">
                {booking.starts_at.toLocaleString("th-TH", {
                  timeZone: "Asia/Bangkok",
                })}{" "}
                –{" "}
                {booking.ends_at.toLocaleString("th-TH", {
                  timeZone: "Asia/Bangkok",
                })}
              </p>
              {booking.traveler_snapshot.note && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {booking.traveler_snapshot.note}
                </p>
              )}
              {booking.status === "requested" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form
                    action={respondToBooking}
                    className="flex items-end gap-2"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="decision" value="quote" />
                    <label className="text-sm">
                      ค่าเช่าสุทธิ (บาท; ไม่รวมเงินประกัน)
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        className="mt-1 h-10 w-32 rounded-lg border bg-background px-3"
                      />
                    </label>
                    <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                      เสนอราคา
                    </button>
                  </form>
                  <form action={respondToBooking} className="self-end">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <button className="h-10 rounded-lg border px-4 text-sm">
                      ไม่รับคำขอ
                    </button>
                  </form>
                </div>
              ) : booking.status === "held" ||
                booking.status === "confirmed" ? (
                <p className="mt-3 text-sm font-medium">
                  ยอดชำระรวมเงินประกัน ฿
                  {(Number(booking.total_satang) / 100).toLocaleString("th-TH")}
                </p>
              ) : null}
            </article>
          ))}
          {!bookings.length && (
            <p className="text-sm text-muted-foreground">ยังไม่มีคำขอจอง</p>
          )}
        </div>
      </section>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <section>
          <h2 className="mb-4 text-xl font-bold">
            รายการยานพาหนะ ({listings.length})
          </h2>
          <div className="space-y-3">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{listing.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {listing.location_text} · {listing.category}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                    {listing.status}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  ฿
                  {(Number(listing.base_price_satang) / 100).toLocaleString(
                    "th-TH",
                  )}
                </p>
                {listing.feedback && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    {listing.feedback}
                  </p>
                )}
                {listing.status === "changes_requested" && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      แก้ไขและส่งตรวจอีกครั้ง
                    </summary>
                    <div className="mt-4">
                      <ListingForm locale={locale} listing={listing} />
                    </div>
                  </details>
                )}
              </article>
            ))}
            {listings.length === 0 && (
              <p className="rounded-2xl border bg-card p-6 text-muted-foreground">
                ยังไม่มีรายการ เพิ่มยานพาหนะเพื่อส่งตรวจสอบ
              </p>
            )}
          </div>
        </section>
        <ListingForm locale={locale} />
      </div>
    </main>
  );
}
