"use client";

import { useState, useTransition } from "react";
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
}: {
  bookingId: string;
  amountSatang: number;
  publicKey: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function openPayment() {
    const omise = (window as Window & { OmiseCard?: OmiseCardApi }).OmiseCard;
    if (!omise) {
      setError("ไม่สามารถเปิดหน้าชำระเงินได้ กรุณาลองใหม่");
      return;
    }
    setError("");
    omise.configure({
      publicKey,
      frameLabel: "RBC GO",
      submitLabel: "ชำระเงินทดสอบ",
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
            setError("ชำระเงินไม่สำเร็จ กรุณาติดต่อทีมงานหรือลองใหม่ภายหลัง");
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
        โหมดทดสอบ Omise เท่านั้น ไม่มีการตัดเงินจริง
      </p>
      <Button type="button" disabled={!ready || pending} onClick={openPayment}>
        {pending ? "กำลังดำเนินการ..." : "ชำระเงินทดสอบ"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
