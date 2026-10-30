"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRBC } from "@/components/rbc/provider";
import { validateDemoOtp } from "@/lib/customer-auth";

export function OtpForm({
  phone,
  expiresAt,
  onBack,
  onVerified,
}: {
  phone: string;
  expiresAt: number;
  onBack: () => void;
  onVerified: () => void;
}) {
  const { t } = useRBC();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(30);
  const [expiry, setExpiry] = useState(expiresAt);
  useEffect(() => {
    const interval = setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = validateDemoOtp(code, expiry);
        if (result) {
          setError(
            result === "expired"
              ? "The code has expired. Request a new code."
              : "Incorrect code. Use the demo code 123456.",
          );
          return;
        }
        onVerified();
      }}
    >
      <FieldGroup>
        <div className="flex items-center gap-3 rounded-xl bg-secondary p-4">
          <Smartphone className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{phone}</p>
            <button
              type="button"
              className="mt-1 text-xs text-primary underline"
              onClick={onBack}
            >
              {t("Change phone number")}
            </button>
          </div>
        </div>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="customer-otp">
            {t("Verification code")}
          </FieldLabel>
          <Input
            id="customer-otp"
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ""));
              setError("");
            }}
            className="h-14 text-center text-2xl tracking-[0.5em] md:text-2xl"
            aria-invalid={!!error}
            aria-describedby="customer-otp-help customer-otp-error"
          />
          {error && <FieldError id="customer-otp-error">{t(error)}</FieldError>}
        </Field>
        <p
          id="customer-otp-help"
          className="rounded-lg bg-ocean-soft px-3 py-2 text-xs leading-6 text-ocean"
        >
          {t("Demo code: 123456. No SMS is sent.")}
        </p>
        <Button type="submit" size="lg" className="w-full">
          {t("Verify and continue")}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <div className="flex items-center justify-between gap-3 text-xs">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {t("Back")}
          </Button>
          <Button
            variant="link"
            size="sm"
            disabled={remaining > 0}
            onClick={() => {
              setExpiry(Date.now() + 300000);
              setCode("");
              setError("");
              setRemaining(30);
            }}
          >
            {t("Resend code")}
            {remaining > 0 ? ` (${remaining}s)` : ""}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
