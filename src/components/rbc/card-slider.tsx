"use client";

import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRBC } from "./provider";

export function CardSlider({
  label,
  columns = 3,
  children,
}: {
  label: string;
  columns?: 3 | 4;
  children: ReactNode;
}) {
  const { t } = useRBC();
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const updateEdges = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const previous = el.scrollLeft > 2;
    const next = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((current) =>
      current.previous === previous && current.next === next
        ? current
        : { previous, next },
    );
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges]);

  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <div role="region" aria-label={t(label)} className="min-w-0">
      <div className="mb-2 flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label={t("Previous cards")}
          aria-controls={id}
          disabled={!edges.previous}
          onClick={() => move(-1)}
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label={t("Next cards")}
          aria-controls={id}
          disabled={!edges.next}
          onClick={() => move(1)}
        >
          <ArrowRight />
        </Button>
      </div>
      <div
        id={id}
        ref={track}
        onScroll={updateEdges}
        className={cn(
          "grid auto-cols-[85%] grid-flow-col gap-5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[calc((100%_-_1.25rem)/2)] motion-reduce:scroll-auto",
          columns === 4
            ? "lg:auto-cols-[calc((100%_-_3.75rem)/4)]"
            : "lg:auto-cols-[calc((100%_-_2.5rem)/3)]",
        )}
      >
        {Children.map(children, (child) => (
          <div className="min-w-0 snap-start [&>*]:h-full">{child}</div>
        ))}
      </div>
    </div>
  );
}
