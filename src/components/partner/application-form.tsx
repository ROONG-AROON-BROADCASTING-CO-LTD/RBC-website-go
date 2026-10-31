"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitPartner, type FormResult } from "@/lib/server/partner-actions";

const initial: FormResult = { error: "" };
const errors: Record<string, string> = {
  invalid_business_name: "กรุณากรอกชื่อธุรกิจ 2–200 ตัวอักษร",
  documents_required: "กรุณาแนบเอกสารอย่างน้อย 1 ไฟล์",
  too_many_documents: "แนบได้สูงสุดครั้งละ 5 ไฟล์",
  invalid_file_size: "แต่ละไฟล์ต้องไม่เกิน 10 MB",
  total_file_size: "ไฟล์ทั้งหมดรวมกันต้องไม่เกิน 10 MB",
  document_limit: "ใบสมัครนี้มีเอกสารครบจำนวนหรือขนาดรวมที่รับได้แล้ว",
  invalid_file_type: "รองรับ PDF, JPG และ PNG เท่านั้น",
  invalid_file_name: "ชื่อไฟล์ไม่ถูกต้อง",
  application_locked: "ใบสมัครนี้อยู่ระหว่างตรวจสอบแล้ว",
  sign_in_required: "กรุณาเข้าสู่ระบบอีกครั้ง",
};

export function PartnerApplicationForm({
  locale,
  businessName,
  documents,
}: {
  locale: string;
  businessName: string;
  documents: { id: string; file_name: string }[];
}) {
  const [state, action, pending] = useActionState(submitPartner, initial);
  return (
    <form
      action={action}
      className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <label className="block text-sm font-semibold">
        ชื่อธุรกิจ
        <Input
          name="business"
          defaultValue={businessName}
          required
          minLength={2}
          maxLength={200}
          className="mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        เอกสารธุรกิจ
        <Input
          name="documents"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="mt-2 h-auto py-3"
        />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">
          PDF, JPG หรือ PNG ขนาดรวมไม่เกิน 10 MB
        </span>
      </label>
      {documents.length > 0 && (
        <div className="rounded-2xl bg-secondary/50 p-4">
          <p className="mb-2 text-sm font-semibold">เอกสารที่อัปโหลดแล้ว</p>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {documents.map((document) => (
              <li key={document.id}>{document.file_name}</li>
            ))}
          </ul>
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {errors[state.error] ?? "ส่งใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง"}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "กำลังส่งใบสมัคร..." : "ส่งใบสมัครเพื่อตรวจสอบ"}
      </Button>
    </form>
  );
}
