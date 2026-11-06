"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, SearchResults } from "./discovery";
import type { Category } from "@/lib/domain";
import type { PublicListing } from "@/lib/server/public-listings";
import { useRBC } from "./provider";

export function ScreenLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12"
    >
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-72 w-full" />
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
export function ScreenRouter({
  parts,
  publicListings = [],
}: {
  parts: string[];
  publicListings?: PublicListing[];
}) {
  const { ready } = useRBC();
  const [route, category] = parts;
  if (!route) return <Home publicListings={publicListings} />;
  if (route === "search")
    return (
      <SearchResults
        key={String(ready)}
        category={category as Category}
        publicListings={publicListings}
      />
    );
  return null;
}
