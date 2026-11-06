"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRBC } from "@/components/rbc/provider";
import type { PublicListing } from "@/lib/server/public-listings";

export function PublishedListingCard({ listing }: { listing: PublicListing }) {
  const { t, href, locale } = useRBC();
  const price = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  });
  return (
    <Card className="overflow-hidden py-0 md:flex-row md:gap-0">
      <div className="relative aspect-[1.5] bg-muted md:aspect-auto md:min-h-60 md:w-[38%] md:shrink-0">
        {listing.image_id && (
          <Image
            src={`/api/listing-images/${listing.image_id}`}
            alt={listing.title}
            fill
            sizes="(max-width:768px) 100vw,300px"
            unoptimized
            className="object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader className="pt-4">
          <CardTitle>
            <Link href={href(`listing/${listing.id}`)}>{listing.title}</Link>
          </CardTitle>
          <CardDescription>
            {listing.location_text} · {listing.business_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground">
            {t(`${listing.capacity} guests`)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {listing.description}
          </p>
        </CardContent>
        <CardFooter className="mt-auto justify-between gap-3 py-3">
          <div>
            <p className="font-semibold">
              {price.format(Number(listing.base_price_satang) / 100)}
            </p>
            <Badge variant="secondary" className="mt-2">
              {t("Booking requests open")}
            </Badge>
          </div>
          <Button asChild variant="outline">
            <Link href={href(`listing/${listing.id}`)}>
              {t("View details")}
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
