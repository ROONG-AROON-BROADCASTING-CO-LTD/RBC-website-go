"use client";
import { useRBC } from "@/components/rbc/provider";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  changePartnerRegistrationEmail,
  loginPartner,
  registerPartner,
  resendPartnerRegistrationCode,
  verifyPartnerRegistration,
  type FormResult,
} from "@/lib/server/partner-actions";
const initial: FormResult = { error: "" };
const messages: Record<string, string> = {
  invalid_name: "Enter a name of at least 2 characters.",
  invalid_email: "Enter a valid email address.",
  invalid_password: "Use a password of at least 12 characters.",
  email_in_use: "This email is already registered. Please sign in.",
  invalid_credentials: "Email or password is incorrect.",
  too_many_attempts: "Try signing in again in 15 minutes.",
  service_unavailable: "This service is unavailable. Please try again later.",
  email_service_unavailable:
    "Email delivery is unavailable. Please try again later.",
  email_delivery_failed: "Email could not be sent. Please try again.",
  code_send_limited: "Too many code requests. Wait before trying again.",
  code_expired: "The code has expired. Please restart registration.",
  invalid_code: "Incorrect verification code.",
  too_many_code_attempts:
    "Too many incorrect codes. Please restart registration.",
};
export function PartnerAuthForm({
  mode,
  locale,
  enabled,
  pendingEmail,
}: {
  mode: "register" | "login";
  locale: string;
  enabled: boolean;
  pendingEmail?: string | null;
}) {
  const { t } = useRBC();
  const [state, action, pending] = useActionState(
    mode === "register" ? registerPartner : loginPartner,
    initial,
  );
  const [verification, verifyAction, verifying] = useActionState(
    verifyPartnerRegistration,
    initial,
  );
  const [resend, resendAction, resending] = useActionState(
    resendPartnerRegistrationCode,
    initial,
  );
  const register = mode === "register";
  const verifyingEmail =
    register && Boolean(pendingEmail || state.step === "verify");
  const email = state.email ?? pendingEmail;
  return (
    <main className="mx-auto max-w-lg px-4 py-10 md:py-16">
      <div className="rounded-3xl border bg-card p-6 shadow-sm md:p-9">
        <p className="text-sm font-bold tracking-widest text-primary">
          RBC GO PARTNERS
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground">
          {verifyingEmail
            ? t("Verify partner email")
            : register
              ? t("Create a partner account")
              : t("Partner sign in")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {verifyingEmail
            ? `${t("Enter the 6-digit code sent to your email within 10 minutes.")} ${email ?? ""}`
            : register
              ? t(
                  "Verify your email, then submit your business details and documents for review.",
                )
              : t("Track your application and manage your business.")}
        </p>
        {!enabled && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {register
              ? t(
                  "Partner registration is currently unavailable. Please try again later.",
                )
              : t("Sign-in is unavailable. Please try again later.")}
          </p>
        )}
        {verifyingEmail ? (
          <>
            <form action={verifyAction} className="mt-7 space-y-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="block text-sm font-medium">
                {t("Email verification code")}
                <Input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="mt-2 text-center text-xl tracking-[.3em]"
                />
              </label>
              {verification.error && (
                <p role="alert" className="text-sm text-destructive">
                  {t(
                    messages[verification.error] ??
                      t("Unable to verify the code. Please try again."),
                  )}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={verifying || !enabled}
                className="w-full"
              >
                {verifying
                  ? t("Verifying code...")
                  : t("Verify email and create account")}
              </Button>
            </form>
            <form action={resendAction} className="mt-4 text-center text-sm">
              <button
                type="submit"
                disabled={resending || !enabled}
                className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                {resending ? t("Sending code...") : t("Resend code")}
              </button>
              {resend.error && (
                <p role="alert" className="mt-2 text-destructive">
                  {t(
                    messages[resend.error] ??
                      t("Unable to send the code. Please try again."),
                  )}
                </p>
              )}
              {resend.message === "code_resent" && (
                <p role="status" className="mt-2 text-muted-foreground">
                  {t("A new code was sent. Check your email.")}
                </p>
              )}
            </form>
            <form
              action={changePartnerRegistrationEmail}
              className="mt-3 text-center text-sm"
            >
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("Change email")}
              </button>
            </form>
          </>
        ) : (
          <form action={action} className="mt-7 space-y-5">
            <input type="hidden" name="locale" value={locale} />
            {register && (
              <label className="block text-sm font-medium">
                {t("Applicant name")}
                <Input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  className="mt-2"
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              {t("Email")}
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("Password")}
              <Input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 12 : undefined}
                className="mt-2"
              />
            </label>
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {t(messages[state.error] ?? t("Please try again."))}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={pending || !enabled}
              className="w-full"
            >
              {pending
                ? t("Processing...")
                : register
                  ? t("Send verification code")
                  : t("Partner sign in")}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {register ? t("Already have an account?") : t("Need an account?")}
          <Link
            href={`/${locale}/${register ? "partner-login" : "partner-signup"}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {register ? t("Partner sign in") : t("Register as a partner")}
          </Link>
        </p>
        <div className="mt-6 rounded-xl bg-muted p-4 text-center text-sm">
          <p className="text-muted-foreground">
            {t("Looking to book a vehicle?")}
          </p>
          <Link
            href={`/${locale}/email`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("Customer sign in")}
          </Link>
        </div>
      </div>
    </main>
  );
}
