import { createTranslator } from "@/lib/i18n";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { listCustomerPartnerBookings } from "@/lib/server/partner-bookings";
export const dynamic = "force-dynamic";
export default async function PartnerBookingsPage({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}) {
  const t = createTranslator((await params).locale);
  const { locale } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/email`);
  const bookings = await listCustomerPartnerBookings(account.id);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-bold">{t("My Bookings")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("Track your requests, quotes and payment status.")}
      </p>
      <div className="mt-7 space-y-3">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/${locale}/partner-bookings/${booking.id}`}
            className="block rounded-2xl border bg-card p-5 transition-colors hover:bg-secondary"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{booking.title}</h2>
              <span className="text-sm">{t(booking.status)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.business_name} ·{" "}
              {booking.starts_at.toLocaleString(
                locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
                {
                  timeZone: "Asia/Bangkok",
                },
              )}
            </p>
          </Link>
        ))}
        {!bookings.length && (
          <p className="rounded-2xl border p-6 text-muted-foreground">
            {t("No booking requests yet")}
          </p>
        )}
      </div>
    </main>
  );
}
