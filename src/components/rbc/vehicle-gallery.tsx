"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Images, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Vehicle } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Photo } from "./common";
import { useRBC } from "./provider";

export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useRBC();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const destination =
    vehicle.location === "Bangkok"
      ? "bangkok"
      : vehicle.location === "Koh Samui"
        ? "samui"
        : vehicle.location === "Chiang Mai"
          ? "chiangmai"
          : "sea";
  const photos = [
    { name: vehicle.img, alt: vehicle.name },
    { name: destination, alt: vehicle.location },
  ].filter(
    (item, position, items) =>
      items.findIndex((other) => other.name === item.name) === position,
  );
  const move = (direction: number) =>
    setIndex(
      (current) => (current + direction + photos.length) % photos.length,
    );
  const show = (position: number) => {
    setIndex(position);
    setOpen(true);
  };
  return (
    <>
      <div className="relative grid aspect-[1.6] grid-cols-3 gap-2 overflow-hidden rounded-2xl md:aspect-[2.7]">
        <button
          type="button"
          onClick={() => show(0)}
          aria-label={t("View photos") + " · " + vehicle.name}
          className={cn(
            "relative col-span-3 min-h-0 overflow-hidden",
            photos.length > 1 && "md:col-span-2",
          )}
        >
          <Photo
            name={photos[0].name}
            alt={photos[0].alt}
            priority
            className="absolute inset-0"
          />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-navy/70 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
            <Images className="size-4" />
            {t("View photos")} ({photos.length})
          </span>
        </button>
        {photos[1] && (
          <button
            type="button"
            onClick={() => show(1)}
            aria-label={t("View photos") + " · " + t(photos[1].alt)}
            className="relative hidden min-h-0 overflow-hidden md:block"
          >
            <Photo
              name={photos[1].name}
              alt={t(photos[1].alt)}
              className="absolute inset-0"
            />
            <span className="absolute bottom-3 left-3 rounded-full bg-navy/70 px-3 py-1 text-xs text-white">
              {t(photos[1].alt)}
            </span>
            <Expand className="absolute right-3 top-3 size-5 text-white" />
          </button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[94dvh] overflow-y-auto sm:max-w-[min(94vw,1100px)]"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{vehicle.name}</DialogTitle>
            <DialogDescription>
              {t("Swipe or use the arrows to browse photos.")}
            </DialogDescription>
          </DialogHeader>
          <div
            className="relative aspect-[1.5] touch-pan-y md:aspect-auto md:h-[55dvh] overflow-hidden rounded-xl bg-navy"
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
            <Photo
              name={photos[index].name}
              alt={t(photos[index].alt)}
              fit="contain"
              sizes="(max-width: 768px) 100vw, 1100px"
              className="h-full bg-navy"
            />
            {photos.length > 1 && (
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {photos.map((photo, position) => (
                <button
                  type="button"
                  key={photo.name}
                  aria-label={t("Photo") + ` ${position + 1}`}
                  aria-current={index === position ? "true" : undefined}
                  onClick={() => setIndex(position)}
                  className={cn(
                    "w-16 overflow-hidden rounded-lg border-2",
                    index === position
                      ? "border-primary"
                      : "border-transparent opacity-60",
                  )}
                >
                  <Photo
                    name={photo.name}
                    alt={t(photo.alt)}
                    className="aspect-[1.5]"
                  />
                </button>
              ))}
            </div>
            <p
              aria-live="polite"
              aria-atomic="true"
              className="shrink-0 text-sm text-muted-foreground"
            >
              {index + 1} / {photos.length}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
