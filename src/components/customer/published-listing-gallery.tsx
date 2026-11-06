"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRBC } from "@/components/rbc/provider";
import { cn } from "@/lib/utils";

export function PublishedListingGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const { t } = useRBC();
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  if (!images.length) return null;
  const move = (direction: number) =>
    setIndex(
      (current) => (current + direction + images.length) % images.length,
    );
  return (
    <Dialog>
      <div className="relative overflow-hidden rounded-2xl bg-muted md:rounded-3xl">
        <div
          className={cn(
            "grid h-64 gap-2 sm:h-96 lg:h-[440px]",
            images.length > 1 && "sm:grid-cols-[1.6fr_1fr]",
            images.length > 2 && "sm:grid-rows-2",
          )}
        >
          {images.slice(0, 3).map((imageId, position) => (
            <DialogTrigger key={imageId} asChild>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`${t("View photos")} · ${t("Photo")} ${position + 1}`}
                className={cn(
                  "group relative min-h-0 overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary",
                  position === 0
                    ? images.length > 2 && "sm:row-span-2"
                    : "hidden sm:block",
                )}
              >
                <Image
                  src={`/api/listing-images/${imageId}`}
                  alt={`${title} · ${t("Photo")} ${position + 1}`}
                  fill
                  unoptimized
                  loading={position === 0 ? "eager" : "lazy"}
                  sizes={
                    position === 0
                      ? "(max-width: 640px) 100vw, (max-width: 1200px) 62vw, 680px"
                      : "(max-width: 1200px) 38vw, 430px"
                  }
                  className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]"
                />
              </button>
            </DialogTrigger>
          ))}
        </div>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="absolute right-3 bottom-3 bg-card shadow-sm sm:right-5 sm:bottom-5"
            onClick={() => setIndex(0)}
          >
            <Images data-icon="inline-start" />
            {t("View photos")} ({images.length})
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        className="max-h-[94dvh] overflow-y-auto sm:max-w-[min(94vw,1100px)]"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="leading-snug">{title}</DialogTitle>
          <DialogDescription>
            {t("Swipe or use the arrows to browse photos.")}
          </DialogDescription>
        </DialogHeader>
        <div
          className="relative h-[52dvh] touch-pan-y overflow-hidden rounded-xl bg-navy sm:h-[62dvh]"
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const end = event.changedTouches[0]?.clientX;
            if (
              touchStart.current !== null &&
              end !== undefined &&
              Math.abs(end - touchStart.current) > 40
            )
              move(end < touchStart.current ? 1 : -1);
            touchStart.current = null;
          }}
          onTouchCancel={() => {
            touchStart.current = null;
          }}
        >
          <Image
            src={`/api/listing-images/${images[index]}`}
            alt={`${title} · ${t("Photo")} ${index + 1}`}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 1100px"
            className="object-contain"
          />
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full"
                aria-label={t("Previous photo")}
                onClick={() => move(-1)}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full"
                aria-label={t("Next photo")}
                onClick={() => move(1)}
              >
                <ArrowRight />
              </Button>
            </>
          )}
        </div>
        <p
          aria-live="polite"
          aria-atomic="true"
          className="text-center text-sm text-muted-foreground"
        >
          {index + 1} / {images.length}
        </p>
      </DialogContent>
    </Dialog>
  );
}
