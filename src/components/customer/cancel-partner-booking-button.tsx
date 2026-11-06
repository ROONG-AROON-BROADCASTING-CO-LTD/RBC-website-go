"use client";
import { useRBC } from "@/components/rbc/provider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelBookingRequest } from "@/app/[locale]/partner-bookings/[id]/actions";
export function CancelPartnerBookingButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const { t } = useRBC();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("Cancel this booking request?"))) return;
          start(async () => {
            const result = await cancelBookingRequest(bookingId);
            if (result.error)
              setError(
                t(
                  "This request cannot be cancelled while a payment is in progress.",
                ),
              );
            else router.refresh();
          });
        }}
      >
        {t("Cancel booking request")}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
