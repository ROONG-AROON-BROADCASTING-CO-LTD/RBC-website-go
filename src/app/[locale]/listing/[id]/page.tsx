import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Locale } from "@/lib/domain";
import { translate } from "@/lib/i18n";
import { getPublicListing } from "@/lib/server/public-listings";
import { currentAccount } from "@/lib/server/auth";
import { PartnerBookingForm } from "@/components/customer/partner-booking-form";
import { PublishedListingGallery } from "@/components/customer/published-listing-gallery";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import { isListingSaved } from "@/lib/server/workspace";
export const dynamic = "force-dynamic";
export default async function PublishedListingPage({
  params,
}: {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
}) {
  const { locale, id } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const listing = await getPublicListing(id);
  if (!listing) notFound();
  const account = await currentAccount();
  const saved = account ? await isListingSaved(account.id, id) : false;
  const t = (text: string) => translate(locale, text);
  const price = new Intl.NumberFormat(
    locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
    { style: "currency", currency: "THB", maximumFractionDigits: 2 },
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 [--primary:#2563eb] md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild className="bg-card">
          <Link href={`/${locale}/search/${listing.category}`}>
            <ArrowLeft data-icon="inline-start" />
            {t("Back to search")}
          </Link>
        </Button>
        {account && (
          <WorkspaceActionForm
            operation="save"
            values={{ listingId: id, saved: String(!saved) }}
            label={saved ? "Remove from saved" : "Save vehicle"}
          />
        )}
      </div>
      <header className="my-6 flex flex-col gap-5 sm:my-7 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl lg:text-4xl">
            {listing.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {listing.location_text}
            </p>
            <p className="flex items-center gap-2">
              <Users
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t(`${listing.capacity} guests`)}
            </p>
          </div>
        </div>
        <Button asChild className="self-start lg:self-auto">
          <Link href="#booking-request">
            {t("Request a booking")}
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </header>
      <PublishedListingGallery images={listing.images} title={listing.title} />
      <Card className="mt-7">
        <CardHeader>
          <CardTitle className="text-xl">{t("Vehicle details")}</CardTitle>
          <CardDescription>
            {t("Provided by")} {listing.business_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap leading-7">{listing.description}</p>
          <dl className="grid gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">{t("Capacity")}</dt>
              <dd className="mt-1 font-semibold">
                {t(`${listing.capacity} guests`)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("Starting price")}
              </dt>
              <dd className="mt-1 text-xl font-semibold text-primary">
                {price.format(Number(listing.base_price_satang) / 100)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("Security deposit")}
              </dt>
              <dd className="mt-1 font-semibold">
                {price.format(Number(listing.deposit_satang) / 100)}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {t(
              "Prices shown are starting prices. Your partner will confirm a final quote after reviewing your dates.",
            )}
          </p>
        </CardContent>
      </Card>
      <div id="booking-request" className="mt-7 max-w-3xl scroll-mt-28">
        <PartnerBookingForm
          locale={locale}
          listingId={listing.id}
          capacity={listing.capacity}
          account={account}
        />
      </div>
    </main>
  );
}
