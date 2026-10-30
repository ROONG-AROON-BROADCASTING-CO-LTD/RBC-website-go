"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { vehicleById } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Blank, Status, Photo } from "@/components/rbc/common";
import { downloadReceipt } from "@/components/rbc/booking";

export function CustomerBookings() {
  const { state, setState, t, href, date, amount } = useRBC();
  const [period, setPeriod] = useState("Upcoming");
  const [cancelId, setCancelId] = useState("");
  const bookings = state.bookings.filter((b) =>
    period === "Upcoming"
      ? !["Cancelled", "Completed"].includes(b.status)
      : ["Cancelled", "Completed"].includes(b.status),
  );
  return (
    <>
      <>
        <ToggleGroup
          className="mb-6"
          type="single"
          value={period}
          onValueChange={(v) => v && setPeriod(v)}
          variant="outline"
        >
          <ToggleGroupItem value="Upcoming">{t("Upcoming")}</ToggleGroupItem>
          <ToggleGroupItem value="Past">{t("Past")}</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-col gap-5">
          {bookings.length ? (
            bookings.map((b) => {
              const v = vehicleById(b.vehicleId)!;
              return (
                <Panel key={b.id} title={b.id}>
                  <div className="flex flex-col gap-5 md:flex-row">
                    <Photo
                      name={v.img}
                      alt={v.name}
                      className="aspect-[1.6] rounded-xl md:aspect-auto md:w-48"
                    />
                    <div className="flex flex-1 flex-col gap-4">
                      <h2 className="text-lg font-semibold">{v.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {date(b.search.date)} · {t(v.location)}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <span className="text-xs">
                          {t("Booking status")}: <Status value={b.status} />
                        </span>
                        <span className="text-xs">
                          {t("Payment status")}: <Status value={b.payment} />
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => downloadReceipt(b, t)}
                        >
                          <Download data-icon="inline-start" />
                          {t("Download receipt")}
                        </Button>
                        {!["Cancelled", "Completed"].includes(b.status) && (
                          <Button
                            variant="ghost"
                            onClick={() => setCancelId(b.id)}
                          >
                            {t("Cancel booking")}
                          </Button>
                        )}
                        <span className="ml-auto font-semibold">
                          {amount(b.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Panel>
              );
            })
          ) : (
            <Blank
              action={
                <Button asChild>
                  <Link href={href()}>{t("Start exploring")}</Link>
                </Button>
              }
            />
          )}
        </div>
      </>
      <Dialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Cancellation request")}</DialogTitle>
            <DialogDescription>
              {t("Cancel this booking and request a refund review?")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId("")}>
              {t("Keep booking")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setState((s) => ({
                  ...s,
                  bookings: s.bookings.map((b) =>
                    b.id === cancelId
                      ? { ...b, status: "Cancelled", payment: "Refund review" }
                      : b,
                  ),
                  activity: [
                    `Cancellation request · ${cancelId}`,
                    ...s.activity,
                  ],
                }));
                setCancelId("");
                toast.success(t("Refund review"));
              }}
            >
              {t("Cancel booking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
