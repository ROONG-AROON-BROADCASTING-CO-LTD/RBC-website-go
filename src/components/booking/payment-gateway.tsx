"use client";

import { useState } from "react";
import {
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Notice, TextField } from "@/components/rbc/common";
import { useRBC } from "@/components/rbc/provider";
import { testCardErrors } from "@/lib/booking-packages";

export type PaymentMethod = "Card" | "PromptPay";

export function PaymentGateway({
  method,
  total,
  processing,
  onCancel,
  onPay,
  onFailure,
}: {
  method: PaymentMethod;
  total: number;
  processing: boolean;
  onCancel: () => void;
  onPay: () => void;
  onFailure: () => void;
}) {
  const { t, state } = useRBC();
  const [card, setCard] = useState({
    name: state.traveler.name,
    number: "",
    expiry: "",
    cvc: "",
  });
  const [invalid, setInvalid] = useState(false);
  const errors = testCardErrors(card);
  const charge = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(total)
    .replace("THB", "฿");
  const patch = (key: keyof typeof card, value: string) =>
    setCard((current) => ({ ...current, [key]: value }));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !processing) onCancel();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!processing}
        onEscapeKeyDown={(event) => {
          if (processing) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (processing) event.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ocean">
            <LockKeyhole className="size-4" /> RBC PAY · DEMO
          </div>
          <DialogTitle>
            {t(processing ? "Processing payment" : "Payment gateway")}
          </DialogTitle>
          <DialogDescription>
            {t("Test payment only. Do not enter real card details.")}
          </DialogDescription>
        </DialogHeader>
        {processing ? (
          <div role="status" className="flex flex-col items-center gap-5 py-12">
            <LoaderCircle className="size-10 animate-spin text-primary" />
            <p>{t("Please wait. Do not close this window.")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary p-4">
              <span className="text-sm">{t("Total")}</span>
              <strong className="text-2xl">{charge}</strong>
            </div>
            {method === "Card" ? (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  setInvalid(true);
                  if (Object.values(errors).some(Boolean)) return;
                  if (card.number.replace(/\s/g, "") === "4000000000000002") {
                    onFailure();
                    return;
                  }
                  onPay();
                }}
              >
                <FieldGroup>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="size-5" />
                      {t("Credit / debit card")}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCard({
                          name: state.traveler.name || "Demo Traveler",
                          number: "4242 4242 4242 4242",
                          expiry: "12/35",
                          cvc: "123",
                        });
                        setInvalid(false);
                      }}
                    >
                      {t("Use test card")}
                    </Button>
                  </div>
                  <TextField
                    label="Cardholder name"
                    value={card.name}
                    autoComplete="off"
                    onChange={(e) => patch("name", e.target.value)}
                    error={invalid ? t(errors.name) : undefined}
                    required
                  />
                  <TextField
                    label="Card number"
                    value={card.number}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    onChange={(e) =>
                      patch(
                        "number",
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 16)
                          .replace(/(.{4})/g, "$1 ")
                          .trim(),
                      )
                    }
                    error={invalid ? t(errors.number) : undefined}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      label="Expiry date"
                      value={card.expiry}
                      inputMode="numeric"
                      placeholder="MM/YY"
                      autoComplete="off"
                      maxLength={5}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4);
                        patch(
                          "expiry",
                          digits.length > 2
                            ? digits.slice(0, 2) + "/" + digits.slice(2)
                            : digits,
                        );
                      }}
                      error={invalid ? t(errors.expiry) : undefined}
                      required
                    />
                    <TextField
                      label="Security code"
                      value={card.cvc}
                      type="password"
                      inputMode="numeric"
                      placeholder="123"
                      autoComplete="off"
                      maxLength={3}
                      onChange={(e) =>
                        patch("cvc", e.target.value.replace(/\D/g, ""))
                      }
                      error={invalid ? t(errors.cvc) : undefined}
                      required
                    />
                  </div>
                  <p className="text-xs leading-6 text-muted-foreground">
                    {t(
                      "Success: 4242 4242 4242 4242. Declined: 4000 0000 0000 0002. Use any future expiry and a 3-digit test code.",
                    )}
                  </p>
                  <Button type="submit" size="lg">
                    <LockKeyhole data-icon="inline-start" />
                    {t("Pay")} {charge}
                  </Button>
                </FieldGroup>
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="mx-auto flex size-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-secondary">
                  <QrCode className="size-24 text-primary" />
                  <span className="text-xs font-bold tracking-widest">
                    DEMO QR
                  </span>
                </div>
                <Notice title="PromptPay demo">
                  This demo QR cannot receive payments. Use the button below to
                  simulate a completed transfer.
                </Notice>
                <div className="text-sm leading-7">
                  <p>{state.traveler.name}</p>
                  <p className="text-muted-foreground">
                    {state.traveler.email}
                  </p>
                </div>
                <Button size="lg" onClick={onPay}>
                  {t("Simulate PromptPay payment")}
                </Button>
                <Button variant="outline" onClick={onFailure}>
                  {t("Simulate failure")}
                </Button>
              </div>
            )}
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-ocean" />
              {t(
                "Card details stay in this dialog and are never saved or sent.",
              )}
            </p>
            <Button variant="ghost" onClick={onCancel}>
              {t("Return to booking")}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
