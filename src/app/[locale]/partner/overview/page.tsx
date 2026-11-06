import {
  WalletCards,
  CalendarDays,
  CarFront,
  ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createTranslator } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import { ListingForm } from "@/components/partner/listing-form";
import { currentAccount } from "@/lib/server/auth";
import { getActivePartner, getPartnerListings } from "@/lib/server/listings";
import { listPartnerBookingRequests } from "@/lib/server/partner-bookings";
import { respondToBooking } from "./booking-actions";
export default async function PartnerOverview({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    bookingError?: string;
  }>;
}) {
  const t = createTranslator((await params).locale);
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
    <main className="business-theme partner-page mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="partner-hero">
        <p className="text-sm font-bold tracking-widest text-primary">
          RBC GO PARTNERS
        </p>
        <h1 className="mt-2 text-3xl font-bold">{partner.business_name}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("Manage your vehicle listings")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/${locale}/partner/earnings`}>
              <WalletCards data-icon="inline-start" />
              {t("Earnings and withdrawals")}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/${locale}/partner/availability`}>
              <CalendarDays data-icon="inline-start" />
              {t("Availability calendar")}
            </Link>
          </Button>
        </div>
      </header>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Booking requests",
            bookings.filter((b) => b.status === "requested").length,
            ClipboardList,
            "company",
          ],
          ["Vehicle listings", listings.length, CarFront, "primary"],
          [
            "Published listings",
            listings.filter((l) => l.status === "approved").length,
            CarFront,
            "received",
          ],
        ].map(([label, value, Icon, tone]) => {
          const Symbol = Icon as typeof CarFront;
          return (
            <section
              key={String(label)}
              className="finance-metric"
              data-tone={tone}
            >
              <span className="finance-metric-icon">
                <Symbol />
              </span>
              <div>
                <h2>{t(String(label))}</h2>
                <p className="finance-metric-value">{String(value)}</p>
              </div>
            </section>
          );
        })}
      </div>
      <section className="partner-bookings mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-bold">
          {t("Booking requests (")}
          {bookings.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Check availability and quote the final price before the customer pays through Omise.",
          )}
        </p>
        {bookingError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {bookingError === "dates_unavailable"
              ? t("These dates are booked or blocked.")
              : bookingError === "invalid_price"
                ? t("Enter a valid final price.")
                : t("This request cannot be changed. Reload the page.")}
          </p>
        )}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{booking.title}</h3>
                <Badge
                  variant={
                    booking.status === "confirmed" ||
                    booking.status === "completed"
                      ? "success"
                      : booking.status === "requested" ||
                          booking.status === "held"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {t(booking.status)}
                </Badge>
              </div>
              <p className="mt-2 text-sm">
                {booking.traveler_snapshot.name} ·{" "}
                {booking.traveler_snapshot.guests}
                {t("guests")}
              </p>
              <p className="text-sm">
                {booking.traveler_snapshot.email}
                {booking.traveler_snapshot.phone &&
                  ` · ${booking.traveler_snapshot.phone}`}
              </p>
              <p className="mt-2 text-sm">
                {booking.starts_at.toLocaleString(
                  locale === "th"
                    ? "th-TH"
                    : locale === "zh"
                      ? "zh-CN"
                      : "en-GB",
                  {
                    timeZone: "Asia/Bangkok",
                  },
                )}{" "}
                –{" "}
                {booking.ends_at.toLocaleString(
                  locale === "th"
                    ? "th-TH"
                    : locale === "zh"
                      ? "zh-CN"
                      : "en-GB",
                  {
                    timeZone: "Asia/Bangkok",
                  },
                )}
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
                      {t("Final rental price (THB, excluding deposit)")}
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
                      {t("Send quote")}
                    </button>
                  </form>
                  <form action={respondToBooking} className="self-end">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <button className="h-10 rounded-lg border px-4 text-sm">
                      {t("Decline request")}
                    </button>
                  </form>
                </div>
              ) : booking.status === "held" ||
                booking.status === "confirmed" ? (
                <p className="mt-3 text-sm font-medium">
                  {t("Total including deposit \u0E3F")}
                  {(Number(booking.total_satang) / 100).toLocaleString("th-TH")}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href={`/${locale}/messages/${booking.id}`}>
                    {t("Messages")}
                  </Link>
                </Button>
                {booking.status === "confirmed" && (
                  <>
                    <WorkspaceActionForm
                      operation="handover"
                      values={{ bookingId: booking.id }}
                      label="Record handover"
                    />
                    <WorkspaceActionForm
                      operation="complete"
                      values={{ bookingId: booking.id }}
                      label="Complete booking"
                    />
                  </>
                )}
              </div>
            </article>
          ))}
          {!bookings.length && (
            <p className="text-sm text-muted-foreground">
              {t("No booking requests yet")}
            </p>
          )}
        </div>
      </section>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <section>
          <h2 className="mb-4 text-xl font-bold">
            {t("Vehicle listings (")}
            {listings.length})
          </h2>
          <div className="flex flex-col gap-3">
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
                  <Badge
                    variant={
                      listing.status === "approved"
                        ? "success"
                        : listing.status === "submitted"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {t(listing.status)}
                  </Badge>
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
                      {t("Edit and resubmit")}
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
                {t("No listings yet. Add a vehicle to submit for review.")}
              </p>
            )}
          </div>
        </section>
        <ListingForm locale={locale} />
      </div>
    </main>
  );
}
