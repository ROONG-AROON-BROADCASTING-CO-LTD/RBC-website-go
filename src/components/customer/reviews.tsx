"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useRBC } from "@/components/rbc/provider";

export function CustomerReviews() {
  const { t, href } = useRBC();
  return (
    <Empty className="min-h-80 border bg-card py-12 shadow-sm">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Star />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{t("No reviews yet")}</EmptyTitle>
        <EmptyDescription>
          {t(
            "Reviews from completed bookings will appear here once booking and review services are available.",
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href={href("account/bookings")}>{t("My Bookings")}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
