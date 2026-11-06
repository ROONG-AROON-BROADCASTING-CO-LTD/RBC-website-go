"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TextField } from "@/components/rbc/common";
import { useRBC } from "@/components/rbc/provider";
import {
  startEmailSignIn,
  finishEmailSignIn,
} from "@/lib/server/email-signin-actions";
import type { AuthMode } from "./provider";
import { OtpForm } from "./otp-form";
import { SocialButtons, SocialIcon } from "./social-buttons";

export default function CustomerAuthDialog({
  initialMode,
  onClose,
  googleEnabled,
  emailOtpEnabled,
  onEmailComplete,
}: {
  initialMode: AuthMode;
  onClose: () => void;
  googleEnabled: boolean;
  emailOtpEnabled: boolean;
  onEmailComplete: () => void;
}) {
  const { state, t, href, locale } = useRBC();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState(state.traveler.email);
  const [name, setName] = useState(state.traveler.name);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [social, setSocial] = useState(false);
  const registering = mode === "register";
  const title = social
    ? "Social sign-in unavailable"
    : challenge
      ? "Verify your email"
      : registering
        ? "Create your account"
        : "Welcome back";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto p-6 sm:max-w-[480px]">
        <DialogHeader>
          <span className="mb-1 inline-flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-primary">
            RBC GO
            <ArrowUpRight className="size-5" />
          </span>
          <DialogTitle className="text-2xl font-semibold leading-snug">
            {t(title)}
          </DialogTitle>
          <DialogDescription>
            {t(
              challenge
                ? "Enter the 6-digit code sent to your email. It expires in 10 minutes."
                : "Your next journey starts here. Keep your bookings and favorites in one place.",
            )}
          </DialogDescription>
        </DialogHeader>
        {social ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-xl border p-4">
              <SocialIcon />
              <p className="font-semibold">Google</p>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              {t("Google sign-in is not configured yet.")}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSocial(false)}
            >
              <ArrowLeft data-icon="inline-start" />
              {t("Back")}
            </Button>
          </div>
        ) : challenge ? (
          <OtpForm
            email={challenge}
            verify={async (code) => {
              const result = await finishEmailSignIn(code, locale);
              if (!result.error) onEmailComplete();
              return result.error;
            }}
            resend={async () => (await startEmailSignIn(name, challenge)).error}
            onBack={() => {
              setChallenge(null);
              setError("");
            }}
          />
        ) : (
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              value={mode}
              aria-label={t("Account access")}
              onValueChange={(value) => {
                if (value === "login" || value === "register") {
                  setMode(value);
                  setInvalid(false);
                  setError("");
                }
              }}
              className="grid w-full grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="login">{t("Sign In")}</ToggleGroupItem>
              <ToggleGroupItem value="register">
                {t("Register")}
              </ToggleGroupItem>
            </ToggleGroup>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                setInvalid(true);
                if (registering && !name.trim()) return;
                if (
                  !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email.trim())
                ) {
                  setError("Please enter a valid email address.");
                  return;
                }
                setError("");
                start(async () => {
                  const result = await startEmailSignIn(name, email);
                  if (result.error) setError(result.error);
                  else setChallenge(result.email);
                });
              }}
            >
              <FieldGroup>
                {registering && (
                  <TextField
                    label="Full name"
                    autoComplete="name"
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    error={
                      invalid && !name.trim()
                        ? t("Please complete the required fields.")
                        : undefined
                    }
                  />
                )}
                <TextField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  required
                  error={error ? t(error) : undefined}
                />
                {!emailOtpEnabled && (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Email sign-in is temporarily unavailable. Please try again later.",
                    )}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={pending || !emailOtpEnabled}
                >
                  <Mail data-icon="inline-start" />
                  {t("Send email code")}
                </Button>
              </FieldGroup>
            </form>
            <Button variant="outline" size="lg" asChild>
              <Link href={href(`email?mode=${mode}`)} onClick={onClose}>
                {t("Use email and password")}
              </Link>
            </Button>
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("Or continue with")}
              </span>
              <Separator className="flex-1" />
            </div>
            <SocialButtons
              href={
                googleEnabled
                  ? `/api/auth/google/start?locale=${locale}`
                  : undefined
              }
              onSelect={() => setSocial(true)}
            />
            <p className="text-center text-sm text-muted-foreground">
              {t(registering ? "Already have an account?" : "New to RBC GO?")}{" "}
              <button
                type="button"
                className="font-semibold text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode(registering ? "login" : "register");
                  setInvalid(false);
                  setError("");
                }}
              >
                {t(registering ? "Sign In" : "Create an account")}
              </button>
            </p>
          </>
        )}
        <div className="border-t pt-4 text-center text-[11px] leading-6 text-muted-foreground">
          <p>{t("Your sign-in is verified securely on the server.")}</p>
          <div className="flex justify-center gap-3">
            <Link
              className="underline underline-offset-2"
              href={href("help")}
              onClick={onClose}
            >
              {t("Booking help")}
            </Link>
            <span>·</span>
            <Link
              className="underline underline-offset-2"
              href={href("help")}
              onClick={onClose}
            >
              {t("Data and privacy")}
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
