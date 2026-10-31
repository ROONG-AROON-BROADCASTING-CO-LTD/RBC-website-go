"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, SearchResults, VehicleDetail } from "./discovery";
import { Confirmation } from "./booking";
const Checkout = dynamic(() => import("@/components/booking/checkout"));
import { Experiences, Help, DesignGuide } from "./design";
import { vehicleById, type Category } from "@/lib/domain";
import type { PublicListing } from "@/lib/server/public-listings";
import { useRBC } from "./provider";
const Account = dynamic(() => import("@/components/customer/account"));
const Partner = dynamic(() => import("@/components/partner/portal"));
const Operations = dynamic(() => import("@/components/operations/workspace"));
const Wizard = dynamic(() => import("@/components/partner/listing-wizard"));
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
  const [route, id] = parts;
  if (!route) return <Home />;
  if (
    !ready &&
    ![
      "search",
      "vehicle",
      "experiences",
      "experience",
      "help",
      "guide",
    ].includes(route)
  )
    return <ScreenLoading />;
  switch (route) {
    case "search":
      return (
        <SearchResults
          key={String(ready)}
          category={id as Category}
          publicListings={publicListings}
        />
      );
    case "vehicle":
      return <VehicleDetail vehicle={vehicleById(id)!} />;
    case "checkout":
      return <Checkout vehicle={vehicleById(id)!} />;
    case "request":
      return <Checkout vehicle={vehicleById(id)!} />;
    case "quote":
      return <Account tab="bookings" />;
    case "confirmation":
      return <Confirmation />;
    case "account":
      return <Account tab={id || "bookings"} />;
    case "partner":
      return <Partner tab={id || "overview"} />;
    case "operations":
      return <Operations tab={id || "overview"} />;
    case "wizard":
      return <Wizard step={Number(id || 0)} />;
    case "experiences":
      return <Experiences />;
    case "experience":
      return <Experiences id={id} />;
    case "help":
      return <Help />;
    case "guide":
      return <DesignGuide />;
    default:
      return null;
  }
}
