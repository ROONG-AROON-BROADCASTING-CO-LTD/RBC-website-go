"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRBC } from "@/components/rbc/provider";

export function OtpForm({
  email,
  onBack,
  verify,
  resend,
}: {
  email: string;
  onBack: () => void;
  verify: (code: string) => Promise<string>;
  resend: () => Promise<string>;
}) {
  const { t } = useRBC();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(60);
  const [pending, start] = useTransition();
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
        start(async () => {
          setError(await verify(code));
        });
      }}
    >
      <FieldGroup>
        <div className="flex items-center gap-3 rounded-xl bg-secondary p-4">
          <Mail className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="break-all font-semibold">{email}</p>
            <button
              type="button"
              disabled={pending}
              className="mt-1 text-xs text-primary underline"
              onClick={onBack}
            >
              {t("Change email address")}
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
          {t("Check your inbox and spam folder. Never share your code.")}
        </p>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || code.length !== 6}
        >
          {t("Verify and continue")}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <div className="flex items-center justify-between gap-3 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onBack}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("Back")}
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={remaining > 0 || pending}
            onClick={() => {
              start(async () => {
                const error = await resend();
                setError(error);
                if (!error) {
                  setCode("");
                  setRemaining(60);
                }
              });
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
