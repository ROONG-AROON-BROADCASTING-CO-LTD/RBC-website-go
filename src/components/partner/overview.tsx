"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Notice, Status } from "@/components/rbc/common";
import { AvailabilityCalendar } from "./availability-calendar";
import { ownIds } from "./vehicles";

export function PartnerOverview() {
  const { state, t, href } = useRBC();
  const p = state.partner;
  const ownBookings = state.bookings.filter((b) =>
    ownIds.includes(b.vehicleId),
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Application status", t(p.status)],
          ["Listings", String(p.listing ? 1 : 0)],
          ["Bookings", String(ownBookings.length)],
        ].map(([name, value]) => (
          <Panel key={name} title={name}>
            <p className="text-2xl font-semibold">{value}</p>
          </Panel>
        ))}
      </div>
      <Panel title="Application review">
        <div className="flex flex-col items-start gap-4">
          <Status value={p.status} />
          {p.feedback && <p>{p.feedback}</p>}
          <p className="text-sm leading-7 text-muted-foreground">
            {t(
              "Our operations team will review your application and documents.",
            )}
          </p>
          <Button variant="outline" asChild>
            <Link href={href("apply")}>
              {t(
                p.status === "Not submitted"
                  ? "Become a Partner"
                  : "Edit application",
              )}
            </Link>
          </Button>
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <AvailabilityCalendar />
        <Panel title="Next step">
          <div className="flex flex-col gap-4 text-sm">
            <Link className="rounded-xl border p-4" href={href("wizard/0")}>
              {t("Create listing")} →
            </Link>
            <Link
              className="rounded-xl border p-4"
              href={href("partner/requests")}
            >
              {t("Incoming service requests")} →
            </Link>
            <Notice title="Demo roles are not authenticated." />
          </div>
        </Panel>
      </div>
    </div>
  );
}
