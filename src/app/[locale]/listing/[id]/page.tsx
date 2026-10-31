import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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

export const dynamic = "force-dynamic";

export default async function PublishedListingPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const listing = await getPublicListing(id);
  if (!listing) notFound();
  const account = await currentAccount();
  const t = (text: string) => translate(locale, text);
  const price = new Intl.NumberFormat(
    locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
    { style: "currency", currency: "THB", maximumFractionDigits: 2 },
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <Button variant="ghost" asChild>
        <Link href={`/${locale}/search/${listing.category}`}>
          {t("Back to search")}
        </Link>
      </Button>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            {t("Published partner vehicle")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            {listing.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {listing.location_text} · {t("Provided by")} {listing.business_name}
          </p>
        </div>
        <Badge variant="secondary">ส่งคำขอจองได้</Badge>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {listing.images.map((imageId) => (
          <div
            key={imageId}
            className="relative aspect-[1.5] overflow-hidden rounded-2xl bg-muted"
          >
            <Image
              src={`/api/listing-images/${imageId}`}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              unoptimized
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <Card className="mt-7">
        <CardHeader>
          <CardTitle className="text-xl">{t("Vehicle details")}</CardTitle>
          <CardDescription>{listing.business_name}</CardDescription>
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
              <dd className="mt-1 font-semibold">
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
            ราคาที่แสดงเป็นราคาเริ่มต้น
            พาร์ทเนอร์จะเสนอราคาสุทธิหลังตรวจสอบวันและเวลา
          </p>
        </CardContent>
      </Card>
      <div className="mt-7 max-w-3xl">
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
