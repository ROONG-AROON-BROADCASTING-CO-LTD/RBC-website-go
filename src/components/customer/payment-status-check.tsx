"use client";
import { useEffect, useTransition, useState } from "react";
import { checkBookingPayment } from "@/app/[locale]/partner-bookings/[id]/actions";
import { useRBC } from "@/components/rbc/provider";
import { Button } from "@/components/ui/button";
export function PaymentStatusCheck({ bookingId }: { bookingId: string }) {
  const { locale, t } = useRBC();
  const [pending, start] = useTransition(),
    [error, setError] = useState("");
  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (++attempts > 6) {
        window.clearInterval(timer);
        return;
      }
      start(async () => {
        await checkBookingPayment(bookingId, locale);
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [bookingId, locale]);
  return (
    <div className="mt-4 flex flex-col gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await checkBookingPayment(bookingId, locale);
            setError(
              result.error
                ? t(
                    "Omise is confirming your payment. Check this page again shortly.",
                  )
                : "",
            );
          })
        }
      >
        {t(pending ? "Processing..." : "Check payment status")}
      </Button>
      {error && (
        <p role="status" className="text-sm text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
