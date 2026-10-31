"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitBookingRequest } from "@/app/[locale]/listing/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const messages: Record<string, string> = {
  invalid_dates:
    "ตรวจสอบวันและเวลาอีกครั้ง (เวลาไทย) เลือกล่วงหน้าอย่างน้อย 1 ชั่วโมง และไม่เกิน 31 วัน",
  invalid_traveler: "ตรวจสอบชื่อ อีเมล และจำนวนผู้เดินทางอีกครั้ง",
  dates_unavailable: "ช่วงเวลานี้ไม่ว่างแล้ว กรุณาเลือกเวลาใหม่",
  listing_unavailable: "รายการนี้ยังไม่พร้อมรับคำขอจอง",
  sign_in_required: "กรุณาเข้าสู่ระบบก่อนส่งคำขอจอง",
};

export function PartnerBookingForm({
  locale,
  listingId,
  capacity,
  account,
}: {
  locale: string;
  listingId: string;
  capacity: number;
  account: {
    display_name: string;
    email: string | null;
    traveler_phone: string | null;
  } | null;
}) {
  const [state, action, pending] = useActionState(submitBookingRequest, {
    error: "",
  });
  if (!account)
    return (
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">ส่งคำขอจอง</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          เข้าสู่ระบบก่อนเลือกวันและส่งคำขอให้พาร์ทเนอร์เสนอราคา
        </p>
        <Button asChild className="mt-4">
          <Link
            href={`/${locale}/email?next=${encodeURIComponent(`/${locale}/listing/${listingId}`)}`}
          >
            เข้าสู่ระบบ
          </Link>
        </Button>
      </div>
    );
  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <h2 className="text-xl font-semibold">ส่งคำขอจอง</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          พาร์ทเนอร์จะตรวจสอบวันว่างและเสนอราคาสุทธิให้คุณก่อนชำระเงิน
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          เริ่มใช้บริการ (เวลาไทย)
          <Input
            name="startsAt"
            type="datetime-local"
            required
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          สิ้นสุด (เวลาไทย)
          <Input
            name="endsAt"
            type="datetime-local"
            required
            className="mt-2"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          ชื่อผู้ติดต่อ
          <Input
            name="name"
            required
            minLength={2}
            maxLength={150}
            defaultValue={account.display_name}
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          อีเมล
          <Input
            name="email"
            type="email"
            required
            defaultValue={account.email ?? ""}
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          โทรศัพท์ (ถ้ามี)
          <Input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={account.traveler_phone ?? ""}
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          จำนวนผู้เดินทาง
          <Input
            name="guests"
            type="number"
            min={1}
            max={capacity}
            defaultValue={1}
            required
            className="mt-2"
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        รายละเอียดเพิ่มเติม
        <textarea
          name="note"
          maxLength={1000}
          rows={3}
          className="mt-2 w-full rounded-lg border bg-background p-3"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {messages[state.error] ?? "ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง"}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "กำลังส่ง..." : "ส่งคำขอจอง"}
      </Button>
    </form>
  );
}
