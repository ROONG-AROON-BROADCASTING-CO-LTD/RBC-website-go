"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelBookingRequest } from "@/app/[locale]/partner-bookings/[id]/actions";

export function CancelPartnerBookingButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("ยกเลิกคำขอจองนี้?")) return;
          start(async () => {
            const result = await cancelBookingRequest(bookingId);
            if (result.error)
              setError("ยกเลิกไม่ได้ อาจมีการชำระเงินกำลังดำเนินการ");
            else router.refresh();
          });
        }}
      >
        ยกเลิกคำขอจอง
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
