"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Blank, Status } from "@/components/rbc/common";
import { downloadReceipt } from "@/components/rbc/booking";

export function CustomerPayments() {
  const { state, t, amount } = useRBC();
  return (
    <div className="flex flex-col gap-5">
      {state.bookings.length ? (
        state.bookings.map((b) => (
          <Panel key={b.id} title={b.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Status value={b.payment} />
              <strong>{amount(b.total)}</strong>
              <Button variant="outline" onClick={() => downloadReceipt(b, t)}>
                <Download data-icon="inline-start" />
                {t("Download receipt")}
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
