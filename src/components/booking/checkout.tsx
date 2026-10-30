"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  addBooking,
  pricing,
  validateDates,
  type Category,
  type Vehicle,
} from "@/lib/domain";
import { selectedPackages } from "@/lib/booking-packages";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";
import { TravelerFields, travelerErrors } from "@/components/rbc/booking";
import {
  Notice,
  PageHeading,
  Panel,
  Photo,
  PriceBreakdown,
} from "@/components/rbc/common";
import { PackagePicker } from "./package-picker";
import { PaymentGateway, type PaymentMethod } from "./payment-gateway";

const steps = ["Booking details", "Add packages", "Payment"];

export default function Checkout({ vehicle: v }: { vehicle: Vehicle }) {
  const { state, setState, t, go, href, date, amount } = useRBC();
  const [step, setStep] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("Card");
  const [phase, setPhase] = useState<
    "idle" | "auth" | "processing" | "failed" | "cancelled"
  >("idle");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const token = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const search = state.search;
  const packages = selectedPackages(v.cat as Category, search.packages);
  const total = pricing(v, search).total;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const changeStep = (next: number) => {
    setStep(next);
    setError("");
    heading.current?.scrollIntoView({ behavior: "instant", block: "start" });
    heading.current?.focus({ preventScroll: true });
  };
  const checkBooking = () => {
    if (
      !validateDates(search, v.cat) ||
      state.partner.blocked.includes(search.date) ||
      (v.id === "mercedes" && state.fleet === "Maintenance")
    ) {
      setError("These dates are unavailable. Try another date.");
      return false;
    }
    return true;
  };
  const continueDetails = () => {
    setInvalid(true);
    if (
      Object.values(travelerErrors(state.traveler)).some(Boolean) ||
      !checkBooking()
    )
      return;
    changeStep(1);
  };
  const openGateway = () => {
    if (!accepted) {
      setError("Please accept the terms before continuing.");
      return;
    }
    if (Object.values(travelerErrors(state.traveler)).some(Boolean)) {
      changeStep(0);
      setInvalid(true);
      return;
    }
    if (!checkBooking()) return;
    token.current = crypto.randomUUID();
    setError("");
    setPhase("auth");
  };
  const finishPayment = () => {
    if (busy.current) return;
    busy.current = true;
    setPhase("processing");
    timer.current = setTimeout(() => {
      const next = addBooking(state, v, token.current, Date.now(), method);
      busy.current = false;
      if (next.bookings.length === state.bookings.length) {
        setPhase("idle");
        setError("These dates are unavailable. Try another date.");
        return;
      }
      setState(next);
      go("confirmation");
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-5 md:py-8">
      <div ref={heading} tabIndex={-1} className="scroll-mt-6 outline-none">
        <PageHeading
          eyebrow="Your journey, one step closer"
          title="Complete your booking"
          description="Choose your extras and pay in a few simple steps."
        />
      </div>
      <ol
        aria-label={t("Booking progress")}
        className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border bg-card p-3 sm:gap-3 sm:p-4"
      >
        {steps.map((name, index) => (
          <li
            key={name}
            aria-current={step === index ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-xs sm:gap-3 sm:text-sm",
              step === index
                ? "font-semibold text-primary"
                : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10",
                step > index
                  ? "bg-ocean-soft text-ocean"
                  : step === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary",
              )}
            >
              {step > index ? <Check className="size-4" /> : index + 1}
            </span>
            <span>{t(name)}</span>
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {step === 0 && (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                continueDetails();
              }}
              className="flex flex-col gap-5"
            >
              <Panel title="Booking details">
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{v.name}</p>
                    <p className="mt-2 text-muted-foreground">
                      {date(search.date)} · {t(v.location)}
                    </p>
                    {["cars", "motorcycles"].includes(v.cat) && (
                      <p className="mt-1 text-muted-foreground">
                        {search.time} → {date(search.returnDate)}{" "}
                        {search.returnTime}
                      </p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={href(`vehicle/${v.id}`)}>
                      {t("Edit details")}
                    </Link>
                  </Button>
                </div>
              </Panel>
              <Panel title="Traveler details">
                <TravelerFields errors={invalid} />
              </Panel>
              {error && <Notice title={error} error />}
              <Button type="submit" size="lg" className="self-end">
                {t("Continue")}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </form>
          )}
          {step === 1 && (
            <>
              <Panel
                title="Add packages"
                description="Make the journey your own."
              >
                <PackagePicker
                  category={v.cat as Category}
                  selected={search.packages ?? []}
                  onChange={(ids) =>
                    setState((current) => ({
                      ...current,
                      search: { ...current.search, packages: ids },
                    }))
                  }
                />
              </Panel>
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => changeStep(0)}>
                  <ArrowLeft data-icon="inline-start" />
                  {t("Back")}
                </Button>
                <Button size="lg" onClick={() => changeStep(2)}>
                  {t("Continue to payment")}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Panel
                title="Payment method"
                description="Choose how you would like to pay."
              >
                <FieldGroup>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={method}
                    onValueChange={(value) => {
                      if (value === "Card" || value === "PromptPay")
                        setMethod(value);
                    }}
                    className="grid w-full grid-cols-2 gap-3"
                    aria-label={t("Payment method")}
                  >
                    <ToggleGroupItem value="Card" className="min-h-16 gap-2">
                      <CreditCard />
                      {t("Credit / debit card")}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="PromptPay"
                      className="min-h-16 gap-2"
                    >
                      <QrCode />
                      PromptPay
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <div className="rounded-xl bg-ocean-soft p-4 text-sm leading-7 text-ocean">
                    <p className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="size-5" />
                      {t("Payment gateway")}
                    </p>
                    <p>
                      {t(
                        "Enter payment details in the next secure checkout window.",
                      )}
                    </p>
                  </div>
                </FieldGroup>
              </Panel>
              <Panel title="Review policies">
                <FieldGroup>
                  <p className="text-sm leading-7">
                    {t(
                      "Free cancellation up to 48 hours before pickup. Later cancellations are subject to review.",
                    )}
                  </p>
                  <Field
                    orientation="horizontal"
                    data-invalid={!!error && !accepted}
                  >
                    <Checkbox
                      id="accept-terms"
                      checked={accepted}
                      onCheckedChange={(value) => setAccepted(value === true)}
                      aria-invalid={!!error && !accepted}
                    />
                    <FieldLabel htmlFor="accept-terms">
                      {t("Accept cancellation and rental terms")}
                    </FieldLabel>
                  </Field>
                </FieldGroup>
              </Panel>
              {error && <Notice title={error} error />}
              {phase === "failed" && (
                <Notice error title="Payment failed. Your details are saved." />
              )}
              {phase === "cancelled" && (
                <Notice title="Payment cancelled. Your details are saved." />
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" onClick={() => changeStep(1)}>
                  <ArrowLeft data-icon="inline-start" />
                  {t("Back")}
                </Button>
                <Button size="lg" onClick={openGateway}>
                  <LockKeyhole data-icon="inline-start" />
                  {t(
                    phase === "failed"
                      ? "Retry payment"
                      : "Continue to payment",
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-6">
          <Panel title="Order summary">
            <Photo
              name={v.img}
              alt={v.name}
              className="mb-4 aspect-[2] rounded-xl"
            />
            <h2 className="text-lg font-semibold">{v.name}</h2>
            <p className="mb-5 mt-2 text-sm text-muted-foreground">
              {date(search.date)} · {t(v.location)}
            </p>
            {packages.length > 0 && (
              <div className="mb-5 rounded-xl bg-ocean-soft p-4">
                <p className="mb-2 text-sm font-semibold text-ocean">
                  {t("Selected packages")}
                </p>
                <ul className="flex flex-col gap-2 text-xs">
                  {packages.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>{t(item.name)}</span>
                      <span className="shrink-0">{amount(item.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <PriceBreakdown vehicle={v} search={search} />
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-ocean" />
              {t("Local demo · No real payments")}
            </p>
          </Panel>
        </aside>
      </div>
      {(phase === "auth" || phase === "processing") && (
        <PaymentGateway
          method={method}
          total={total}
          processing={phase === "processing"}
          onCancel={() => setPhase("cancelled")}
          onFailure={() => setPhase("failed")}
          onPay={finishPayment}
        />
      )}
    </div>
  );
}
