"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vehicleById } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Blank, Status, Photo } from "@/components/rbc/common";
import { downloadReceipt } from "@/components/rbc/booking";

export function CustomerPayments() {
  const { state, t, amount, date } = useRBC();
  return (
    <div className="flex flex-col gap-5">
      {state.bookings.length ? (
        state.bookings.map((b) => {
          const vehicle = vehicleById(b.vehicleId);
          return (
            <Panel key={b.id} title={b.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {vehicle && (
                  <Photo
                    name={vehicle.img}
                    alt={vehicle.name}
                    className="aspect-[1.5] rounded-xl sm:h-28 sm:w-40 sm:shrink-0"
                    sizes="(max-width: 640px) 100vw, 160px"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">
                    {vehicle?.name ?? b.vehicleId}
                  </h2>
                  {vehicle && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {date(b.search.date)} · {t(vehicle.location)}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-5">
                    <Status value={b.payment} />
                    <strong>{amount(b.total)}</strong>
                    <Button
                      variant="outline"
                      className="sm:ml-auto"
                      onClick={() => downloadReceipt(b, t)}
                    >
                      <Download data-icon="inline-start" />
                      {t("Download receipt")}
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          );
        })
      ) : (
        <Blank />
      )}
    </div>
  );
}
