"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRBC } from "./provider";

export function Rating({
  score,
  reviews,
  className,
}: {
  score: number;
  reviews?: number;
  className?: string;
}) {
  const { t } = useRBC();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rating-soft px-2.5 py-1 text-xs text-rating-foreground",
        className,
      )}
    >
      <Star aria-hidden="true" className="size-3.5 fill-rating text-rating" />
      <span className="font-semibold">
        {score.toFixed(1)}
        <span className="sr-only"> / 5</span>
      </span>
      {reviews !== undefined && (
        <span>
          · {reviews} {t("sample reviews")}
        </span>
      )}
    </span>
  );
}
