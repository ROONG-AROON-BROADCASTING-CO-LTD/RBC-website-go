"use client";
import { useActionState } from "react";
import Link from "next/link";
import { accountAccessAction } from "@/lib/server/account-access-actions";
import { useRBC } from "@/components/rbc/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

export function AccountAccessForm({
  mode,
  token,
}: {
  mode: string;
  token?: string;
}) {
  const { t, locale } = useRBC();
  const [state, action, pending] = useActionState(accountAccessAction, {
    error: "",
    message: "",
  });
  const label =
    mode === "request-verify"
      ? "Verify email"
      : mode === "verify"
        ? "Confirm email"
        : mode === "reset"
          ? "Set new password"
          : "Reset password";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="token" value={token ?? ""} />
      <FieldGroup>
        {mode === "request-reset" && (
          <Field>
            <FieldLabel htmlFor="recovery-email">
              {t("Email address")}
            </FieldLabel>
            <Input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </Field>
        )}
        {mode === "reset" && (
          <Field>
            <FieldLabel htmlFor="new-password">{t("New password")}</FieldLabel>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
              required
            />
          </Field>
        )}
      </FieldGroup>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-muted-foreground">
          {t(state.message)}
        </p>
      )}
      {!state.message && (
        <Button type="submit" disabled={pending}>
          {t(pending ? "Saving..." : label)}
        </Button>
      )}
      {state.message && mode === "reset" && (
        <Button asChild variant="outline">
          <Link href={`/${locale}/email`}>{t("Sign In")}</Link>
        </Button>
      )}
    </form>
  );
}
