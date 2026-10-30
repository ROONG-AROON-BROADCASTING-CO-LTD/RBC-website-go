"use client";

import { useRBC } from "@/components/rbc/provider";
import { Panel } from "@/components/rbc/common";
import { ownIds } from "./vehicles";

export function PartnerEarnings() {
  const { state, t, amount } = useRBC();
  const ownBookings = state.bookings.filter((b) =>
    ownIds.includes(b.vehicleId),
  );
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[
        [
          "Gross earnings",
          amount(
            ownBookings
              .filter((b) => b.status !== "Cancelled")
              .reduce((sum, b) => sum + b.total, 0),
          ),
        ],
        ["Commission", "10% · " + t("Sample")],
        ["Payout status", t(state.payout)],
      ].map(([name, value]) => (
        <Panel title={name} key={name}>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("All amounts are illustrative.")}
          </p>
        </Panel>
      ))}
    </div>
  );
}
