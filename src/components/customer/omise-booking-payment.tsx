"use client";
import { useRBC } from "@/components/rbc/provider";
import { useState, useTransition } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { payBookingWithOmise } from "@/app/[locale]/partner-bookings/[id]/actions";
type OmiseCardApi = {
  configure: (options: {
    publicKey: string;
    frameLabel: string;
    submitLabel: string;
    currency: string;
  }) => void;
  open: (options: {
    amount: number;
    currency: string;
    defaultPaymentMethod: string;
    onCreateTokenSuccess: (nonce: string) => void;
  }) => void;
};
export function OmiseBookingPayment({
  bookingId,
  amountSatang,
  publicKey,
  testMode,
}: {
  bookingId: string;
  amountSatang: number;
  publicKey: string;
  testMode: boolean;
}) {
  const { t, href } = useRBC();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  function openPayment() {
    const omise = (
      window as Window & {
        OmiseCard?: OmiseCardApi;
      }
    ).OmiseCard;
    if (!omise) {
      setError(t("Unable to open payment. Please try again."));
      return;
    }
    setError("");
    omise.configure({
      publicKey,
      frameLabel: "RBC GO",
      submitLabel: testMode ? t("Pay in test mode") : t("Pay now"),
      currency: "THB",
    });
    omise.open({
      amount: amountSatang,
      currency: "THB",
      defaultPaymentMethod: "credit_card",
      onCreateTokenSuccess(nonce) {
        start(async () => {
          const result = await payBookingWithOmise(bookingId, nonce);
          if (result.error) {
            setVerificationRequired(result.error === "verification_required");
            setError(
              t(
                result.error === "verification_required"
                  ? "Verify your email or phone before paying."
                  : "Payment could not be confirmed. Contact support or try again later.",
              ),
            );
            return;
          }
          if (result.authorizeUri) window.location.assign(result.authorizeUri);
          else router.refresh();
        });
      },
    });
  }
  return (
    <div className="space-y-3">
      <Script
        src="https://cdn.omise.co/omise.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <p className="text-sm text-muted-foreground">
        {testMode
          ? t("Omise test mode. No real money is charged.")
          : t("Pay securely through Omise")}
      </p>
      <Button type="button" disabled={!ready || pending} onClick={openPayment}>
        {pending
          ? t("Processing...")
          : testMode
            ? t("Pay in test mode")
            : t("Pay now")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {verificationRequired && (
        <Button asChild variant="outline">
          <Link href={href("account/profile")}>{t("Verify email")}</Link>
        </Button>
      )}
    </div>
  );
}
