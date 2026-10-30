"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Notice } from "@/components/rbc/common";

export function OperationsOverview() {
  const { state, t, href } = useRBC();
  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Partners",
            state.partner.status === "Pending approval" ? 1 : 0,
            "partners",
          ],
          [
            "Listings",
            state.partner.listing?.status === "Pending approval" ? 1 : 0,
            "listings",
          ],
          ["Requests", state.quote ? 1 : 0, "requests"],
          ["Bookings", state.bookings.length, "bookings"],
        ].map(([name, count, url]) => (
          <Panel key={name} title={String(name)}>
            <p className="mb-5 text-4xl font-semibold">{count}</p>
            <Link
              href={href(`operations/${url}`)}
              className="flex items-center gap-2 text-xs text-primary"
            >
              {t("View Details")}
              <ArrowRight className="size-4" />
            </Link>
          </Panel>
        ))}
      </div>
      <Panel title="Next actions">
        <div className="flex flex-col gap-3">
          {[
            ["Partner verification", "partners"],
            ["Listing approval", "listings"],
            ["Prepare quotations", "requests"],
            ["Payment and refund tracking", "payments"],
          ].map(([name, url]) => (
            <Link
              href={href(`operations/${url}`)}
              key={url}
              className="flex items-center justify-between gap-4 rounded-xl border p-5 text-sm"
            >
              <span>{t(name)}</span>
              <ArrowRight className="size-4" />
            </Link>
          ))}
        </div>
      </Panel>
      <Notice title="Demo roles are not authenticated.">
        Storage is local to this browser.
      </Notice>
    </div>
  );
}
