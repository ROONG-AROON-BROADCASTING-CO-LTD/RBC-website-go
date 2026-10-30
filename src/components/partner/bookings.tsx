"use client";

import { Button } from "@/components/ui/button";
import { vehicleById } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Status, Blank } from "@/components/rbc/common";
import { ownIds } from "./vehicles";

export function PartnerBookings() {
  const { state, setState, t } = useRBC();
  const ownBookings = state.bookings.filter((b) =>
    ownIds.includes(b.vehicleId),
  );
  return (
    <div className="flex flex-col gap-5">
      {ownBookings.length ? (
        ownBookings.map((b) => (
          <Panel key={b.id} title={b.id}>
            <div className="flex flex-col items-start gap-4">
              <h2>{vehicleById(b.vehicleId)?.name}</h2>
              <Status value={b.status} />
              <p className="text-sm text-muted-foreground">
                {b.traveler.name} · {b.search.date}
              </p>
              <Button
                variant="outline"
                disabled={b.status !== "Confirmed" || b.handover}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    bookings: s.bookings.map((item) =>
                      item.id === b.id ? { ...item, handover: true } : item,
                    ),
                  }))
                }
              >
                {t(b.handover ? "Handover completed" : "Complete handover")}
              </Button>
            </div>
          </Panel>
        ))
      ) : (
        <Blank />
      )}
    </div>
  );
}
