"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { vehicleById } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";
import {
  Panel,
  TextField,
  ChoiceField,
  Status,
  Notice,
  Photo,
  PriceBreakdown,
} from "@/components/rbc/common";
import type { Row } from "./records";

export function RecordDetails({
  tab,
  selected,
  current,
  onClose,
}: {
  tab: string;
  selected: string;
  current: Row | undefined;
  onClose: () => void;
}) {
  const { state, setState, t, amount } = useRBC();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const booking = state.bookings.find((b) => b.id === selected);
  const q = state.quote;
  const revision = () => {
    if (!feedback.trim()) {
      setError("Revision feedback is required.");
      return;
    }
    setState((s) => ({
      ...s,
      partner:
        tab === "partners"
          ? { ...s.partner, status: "Changes requested", feedback }
          : {
              ...s.partner,
              listing: s.partner.listing
                ? {
                    ...s.partner.listing,
                    status: "Changes requested",
                    feedback,
                  }
                : null,
            },
      activity: [`Changes requested · ${selected}`, ...s.activity],
    }));
    setError("");
    toast.success(t("Changes requested"));
  };
  const approve = () => {
    if (tab === "listings" && state.partner.status !== "Approved") {
      setError("Partner approval is required first.");
      return;
    }
    setState((s) => ({
      ...s,
      partner:
        tab === "partners"
          ? { ...s.partner, status: "Approved", feedback: undefined }
          : {
              ...s.partner,
              listing: s.partner.listing
                ? {
                    ...s.partner.listing,
                    status: "Approved",
                    feedback: undefined,
                  }
                : null,
            },
      activity: [`Approved · ${selected}`, ...s.activity],
    }));
    setError("");
    toast.success(t("Approved"));
  };
  return (
    <Sheet open={!!current} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{current?.name}</SheetTitle>
          <SheetDescription>
            {selected} · {t("Demo workspace")}
          </SheetDescription>
        </SheetHeader>
        {current && (
          <div className="flex flex-col gap-6 p-5">
            <Status value={current.status} />
            <p className="text-sm text-muted-foreground">{current.detail}</p>
            {["partners", "listings"].includes(tab) && (
              <>
                <Panel
                  title={tab === "partners" ? "Supporting documents" : "Photos"}
                >
                  <div className="flex flex-col gap-3 text-sm">
                    {(tab === "partners"
                      ? state.partner.documents
                      : state.partner.listing?.photos || []
                    ).map((file) => (
                      <p key={file} className="break-all">
                        {file}
                      </p>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-6 text-muted-foreground">
                    {t("Upload names only; files are not sent to a server.")}
                  </p>
                </Panel>
                {tab === "listings" && (
                  <p className="text-sm leading-7">
                    {state.partner.listing?.policy}
                  </p>
                )}
                <Button
                  disabled={current.status === "Approved"}
                  onClick={approve}
                >
                  <CheckCircle2 data-icon="inline-start" />
                  {t("Approve")}
                </Button>
                <Field>
                  <FieldLabel htmlFor="revision-feedback">
                    {t("Review feedback")}
                  </FieldLabel>
                  <Textarea
                    id="revision-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </Field>
                <Button variant="outline" onClick={revision}>
                  {t("Request revision")}
                </Button>
              </>
            )}
            {tab === "requests" && q && (
              <>
                <Photo
                  name={vehicleById(q.vehicleId)!.img}
                  alt={current.name}
                  className="aspect-[1.6] rounded-xl"
                />
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {q.requirements}
                </p>
                <p className="text-sm">
                  {q.search.date} · {t(`${q.search.guests} guests`)}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const rental = Number(data.get("rental"));
                    if (!Number.isFinite(rental) || rental <= 0) {
                      setError("Please complete the required fields.");
                      return;
                    }
                    setState((s) => ({
                      ...s,
                      quote: s.quote
                        ? {
                            ...s.quote,
                            rental,
                            status: "Quote Ready",
                            expiresAt: Date.now() + 86400000,
                          }
                        : null,
                      activity: [`Quote Ready · ${selected}`, ...s.activity],
                    }));
                    toast.success(t("Quote Ready"));
                  }}
                >
                  <FieldGroup>
                    <TextField
                      label="Quotation rental amount"
                      name="rental"
                      type="number"
                      required
                      min={1}
                      defaultValue={
                        q.rental || vehicleById(q.vehicleId)!.price || 180000
                      }
                    />
                    <Field orientation="horizontal">
                      <Checkbox
                        id="secure-availability"
                        checked={q.availability}
                        onCheckedChange={(v) =>
                          setState((s) => ({
                            ...s,
                            quote: s.quote
                              ? { ...s.quote, availability: v === true }
                              : null,
                          }))
                        }
                      />
                      <FieldLabel htmlFor="secure-availability">
                        {t("Secure availability")}
                      </FieldLabel>
                    </Field>
                    <PriceBreakdown
                      vehicle={vehicleById(q.vehicleId)!}
                      search={q.search}
                      quotedRental={q.rental}
                    />
                    <Button
                      type="submit"
                      disabled={state.bookings.some(
                        (booking) => booking.quoteId === q.id,
                      )}
                    >
                      {t("Publish quotation")}
                    </Button>
                  </FieldGroup>
                </form>
              </>
            )}
            {tab === "bookings" && booking && (
              <>
                <Photo
                  name={vehicleById(booking.vehicleId)!.img}
                  alt={current.name}
                  className="aspect-[1.6] rounded-xl"
                />
                <p className="text-sm">
                  {booking.search.date} · {booking.traveler.email}
                </p>
                <Notice title="Payment status">{t(booking.payment)}</Notice>
                {booking.status === "Awaiting confirmation" && (
                  <Button
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        bookings: s.bookings.map((b) =>
                          b.id === booking.id
                            ? { ...b, status: "Confirmed" }
                            : b,
                        ),
                        activity: [
                          `Availability confirmed · ${booking.id}`,
                          ...s.activity,
                        ],
                      }))
                    }
                  >
                    {t("Confirm availability")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={booking.status !== "Confirmed" || booking.handover}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      bookings: s.bookings.map((b) =>
                        b.id === booking.id ? { ...b, handover: true } : b,
                      ),
                    }))
                  }
                >
                  {t(
                    booking.handover
                      ? "Handover completed"
                      : "Complete handover",
                  )}
                </Button>
                <Button
                  variant="outline"
                  disabled={booking.status !== "Confirmed" || !booking.handover}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      bookings: s.bookings.map((b) =>
                        b.id === booking.id ? { ...b, status: "Completed" } : b,
                      ),
                    }))
                  }
                >
                  {t("Mark completed")}
                </Button>
              </>
            )}
            {tab === "payments" && booking && (
              <>
                <p className="text-3xl font-semibold">
                  {amount(booking.total)}
                </p>
                <Notice title="Booking status">{t(booking.status)}</Notice>
                <Button
                  disabled={
                    !["Refund review", "Refund processing"].includes(
                      booking.payment,
                    )
                  }
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      bookings: s.bookings.map((b) =>
                        b.id === booking.id
                          ? {
                              ...b,
                              payment:
                                b.payment === "Refund review"
                                  ? "Refund processing"
                                  : "Refunded",
                            }
                          : b,
                      ),
                      activity: [
                        `Refund updated · ${booking.id}`,
                        ...s.activity,
                      ],
                    }))
                  }
                >
                  {t(
                    booking.payment === "Refund processing"
                      ? "Complete refund"
                      : "Start refund",
                  )}
                </Button>
              </>
            )}
            {tab === "fleet" && (
              <>
                <Photo
                  name="car"
                  alt="Mercedes-Benz E-Class"
                  className="aspect-[1.6] rounded-xl"
                />
                <p className="text-sm">RBC-001 · {t("Phuket")}</p>
                <ChoiceField
                  label="Fleet status"
                  value={state.fleet}
                  onChange={(value) =>
                    setState((s) => ({
                      ...s,
                      fleet: value as "Available" | "Maintenance",
                      activity: [`Fleet · ${value}`, ...s.activity],
                    }))
                  }
                  options={["Available", "Maintenance"]}
                />
                <Notice title="Next step">
                  Update maintenance status before accepting new bookings.
                </Notice>
              </>
            )}
            {error && <Notice error title={error} />}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
