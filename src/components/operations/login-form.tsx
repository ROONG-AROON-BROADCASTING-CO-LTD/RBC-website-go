"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { createTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";
import { loginStaff } from "@/lib/server/staff-actions";

const messages: Record<string, string> = {
  invalid_credentials: "Email or password is incorrect.",
  too_many_attempts: "Try signing in again in 15 minutes.",
  staff_access_required:
    "This account does not have staff access. Contact your administrator.",
  service_unavailable: "Sign-in is unavailable. Please try again later.",
};

export function StaffLoginForm({
  locale,
  enabled,
}: {
  locale: Locale;
  enabled: boolean;
}) {
  const t = createTranslator(locale);
  const [state, action, pending] = useActionState(loginStaff, { error: "" });
  const [email, setEmail] = useState("");
  return (
    <main
      lang={locale}
      className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10"
    >
      <div className="flex flex-col gap-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
          <span className="text-sm font-bold tracking-widest text-primary">
            RBC GO TEAM
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t("Staff sign in")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("Review partner applications, vehicle listings and operations.")}
          </p>
        </div>
        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="locale" value={locale} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="staff-email">
                {t("Email address")}
              </FieldLabel>
              <Input
                id="staff-email"
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-password">{t("Password")}</FieldLabel>
              <Input
                id="staff-password"
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={256}
                required
              />
            </Field>
          </FieldGroup>
          {state.error && (
            <FieldError>
              {t(messages[state.error] ?? "Please try again.")}
            </FieldError>
          )}
          {!enabled && (
            <p role="status" className="text-sm text-muted-foreground">
              {t(messages.service_unavailable)}
            </p>
          )}
          <Button type="submit" size="lg" disabled={!enabled || pending}>
            {t(pending ? "Signing in..." : "Staff sign in")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t(
            "Use an account that has been granted staff access by your administrator.",
          )}
        </p>
      </div>
      <nav
        aria-label={t("Language")}
        className="flex justify-center gap-4 text-sm"
      >
        <Link
          href="/admin"
          hrefLang="th"
          aria-current={locale === "th" ? "page" : undefined}
        >
          ไทย
        </Link>
        <Link
          href="/admin?lang=en"
          hrefLang="en"
          aria-current={locale === "en" ? "page" : undefined}
        >
          English
        </Link>
        <Link
          href="/admin?lang=zh"
          hrefLang="zh"
          aria-current={locale === "zh" ? "page" : undefined}
        >
          中文
        </Link>
      </nav>
      <Link
        href={`/${locale}`}
        className="text-center text-sm text-primary underline-offset-4 hover:underline"
      >
        {t("Back to website")}
      </Link>
    </main>
  );
}
