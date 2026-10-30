"use client";

import { Button } from "@/components/ui/button";
import { vehicleById } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Status, Blank } from "@/components/rbc/common";
import { ownIds } from "./vehicles";

export function PartnerRequests() {
  const { state, setState, t } = useRBC();
  const ownRequest =
    state.quote && ownIds.includes(state.quote.vehicleId) ? state.quote : null;
  return ownRequest ? (
    <Panel title={ownRequest.id}>
      <div className="flex flex-col gap-5">
        <p className="font-semibold">
          {vehicleById(ownRequest.vehicleId)?.name}
        </p>
        <p className="text-sm leading-7">{ownRequest.requirements}</p>
        <Status value={state.serviceRequest} />
        <div className="flex gap-3">
          <Button
            disabled={state.serviceRequest === "Accepted"}
            onClick={() =>
              setState((s) => ({
                ...s,
                serviceRequest: "Accepted",
                quote: s.quote ? { ...s.quote, availability: true } : null,
                activity: ["Partner accepted request", ...s.activity],
              }))
            }
          >
            {t("Accept")}
          </Button>
          <Button
            variant="outline"
            disabled={state.serviceRequest === "Declined"}
            onClick={() =>
              setState((s) => ({
                ...s,
                serviceRequest: "Declined",
                quote: s.quote
                  ? {
                      ...s.quote,
                      availability: false,
                      status: "Under Review",
                    }
                  : null,
                activity: ["Partner declined request", ...s.activity],
              }))
            }
          >
            {t("Decline")}
          </Button>
        </div>
      </div>
    </Panel>
  ) : (
    <Blank />
  );
}
