"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Smartphone } from "lucide-react";
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
import { ChoiceField, TextField } from "@/components/rbc/common";
import { useRBC } from "@/components/rbc/provider";
import { normalizeCustomerPhone, type DemoCustomer } from "@/lib/customer-auth";
import type { AuthMode } from "./provider";
import { OtpForm } from "./otp-form";
import { SocialButtons, SocialIcon } from "./social-buttons";

export default function CustomerAuthDialog({
  initialMode,
  onClose,
  onComplete,
  googleEnabled,
}: {
  initialMode: AuthMode;
  onClose: () => void;
  onComplete: (profile: Omit<DemoCustomer, "kind" | "id">) => void;
  googleEnabled: boolean;
}) {
  const { state, t, href, locale } = useRBC();
  const [mode, setMode] = useState(initialMode);
  const [country, setCountry] = useState("+66");
  const [phone, setPhone] = useState(state.traveler.phone);
  const [name, setName] = useState(state.traveler.name);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [challenge, setChallenge] = useState<{
    phone: string;
    expiresAt: number;
  } | null>(null);
  const [social, setSocial] = useState(false);
  const registering = mode === "register";
  const title = social
    ? "Social sign-in unavailable"
    : challenge
      ? "Verify your phone number"
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
                ? "Enter the 6-digit code to continue."
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
            <Button variant="ghost" onClick={() => setSocial(false)}>
              <ArrowLeft data-icon="inline-start" />
              {t("Back")}
            </Button>
          </div>
        ) : challenge ? (
          <OtpForm
            phone={challenge.phone}
            expiresAt={challenge.expiresAt}
            onBack={() => {
              setChallenge(null);
              setError("");
            }}
            onVerified={() =>
              onComplete({
                method: "phone",
                phone: challenge.phone,
                name: name.trim() || state.traveler.name || t("Demo traveler"),
                email: state.traveler.email,
              })
            }
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
                const normalized = normalizeCustomerPhone(country, phone);
                if (!normalized) {
                  setError("Please enter a valid mobile number.");
                  return;
                }
                setError("");
                setChallenge({
                  phone: normalized,
                  expiresAt: Date.now() + 300000,
                });
              }}
            >
              <FieldGroup>
                {registering && (
                  <>
                    <TextField
                      label="Full name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      error={
                        invalid && !name.trim()
                          ? t("Please complete the required fields.")
                          : undefined
                      }
                    />
                  </>
                )}
                <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3">
                  <ChoiceField
                    label="Country code"
                    value={country}
                    onChange={(value) => {
                      setCountry(value);
                      setError("");
                    }}
                    options={[
                      { value: "+66", label: "🇹🇭 +66" },
                      { value: "+65", label: "🇸🇬 +65" },
                      { value: "+1", label: "🇺🇸 +1" },
                      { value: "+44", label: "🇬🇧 +44" },
                    ]}
                  />
                  <TextField
                    label="Phone number"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                    placeholder="081 234 5678"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setError("");
                    }}
                    required
                    error={error ? t(error) : undefined}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  <Smartphone data-icon="inline-start" />
                  {t("Continue with phone number")}
                </Button>
              </FieldGroup>
            </form>
            <Button variant="outline" size="lg" asChild>
              <Link href={href(`email?mode=${mode}`)} onClick={onClose}>
                {t("Continue with email")}
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
              onSelect={() => {
                if (googleEnabled) {
                  window.location.assign(
                    `/api/auth/google/start?locale=${locale}`,
                  );
                } else {
                  setSocial(true);
                }
              }}
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
          <p>
            {t(
              "SMS verification is a demo. Email and configured social sign-ins use server sessions.",
            )}
          </p>
          <div className="flex justify-center gap-3">
            <Link
              className="underline underline-offset-2"
              href={href("help")}
              onClick={onClose}
            >
              {t("Terms of use")}
            </Link>
            <span>·</span>
            <Link
              className="underline underline-offset-2"
              href={href("help")}
              onClick={onClose}
            >
              {t("Privacy policy")}
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
