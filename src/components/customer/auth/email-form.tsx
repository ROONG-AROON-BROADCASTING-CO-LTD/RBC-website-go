"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { TextField } from "@/components/rbc/common";
import { useRBC } from "@/components/rbc/provider";
import {
  submitCustomerEmail,
  type CustomerEmailResult,
} from "@/lib/server/customer-actions";

const initial: CustomerEmailResult = { error: "" };
const errors: Record<string, string> = {
  invalid_name: "Enter a name of at least 2 characters.",
  invalid_email: "Enter a valid email address.",
  invalid_password: "Use a password of at least 12 characters.",
  email_in_use: "This email is already registered.",
  invalid_credentials: "Email or password is incorrect.",
  too_many_attempts: "Too many attempts. Please try again later.",
  service_unavailable: "Email sign-in is temporarily unavailable.",
  invalid_request: "Please try again.",
};

export function CustomerEmailForm({
  locale,
  mode,
  enabled,
  authError,
  returnTo,
}: {
  locale: string;
  mode: "login" | "register";
  enabled: boolean;
  authError?: string;
  returnTo?: string;
}) {
  const { t } = useRBC();
  const [state, action, pending] = useActionState(submitCustomerEmail, initial);
  const registering = mode === "register";
  return (
    <main className="mx-auto max-w-lg px-4 py-12 md:py-20">
      <h1 className="text-3xl font-semibold">
        {t(registering ? "Create account with email" : "Sign in with email")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Use your email and password to access your account.")}
      </p>
      {authError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {t(
            authError === "google_unavailable"
              ? "Google sign-in is not configured yet."
              : "Google sign-in did not complete. Please try again.",
          )}
        </p>
      )}
      <form action={action} className="mt-7 rounded-2xl border bg-card p-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={returnTo ?? ""} />
        <FieldGroup>
          {registering && (
            <TextField
              label="Full name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
            />
          )}
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            required
            minLength={registering ? 12 : undefined}
            maxLength={256}
          />
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(errors[state.error] ?? "Please try again.")}
            </p>
          )}
          <Button type="submit" size="lg" disabled={!enabled || pending}>
            {t(registering ? "Create account" : "Sign In")}
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-5 text-center text-sm">
        {t(registering ? "Already have an account?" : "New to RBC GO?")}{" "}
        <Link
          href={`/${locale}/email?mode=${registering ? "login" : "register"}${returnTo ? `&next=${encodeURIComponent(returnTo)}` : ""}`}
          className="font-semibold text-primary underline"
        >
          {t(registering ? "Sign In" : "Create an account")}
        </Link>
      </p>
    </main>
  );
}
