"use client";

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
  invalid_name: "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร",
  invalid_email: "กรุณากรอกอีเมลให้ถูกต้อง",
  invalid_password: "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร",
  email_in_use: "อีเมลนี้ถูกใช้แล้ว กรุณาเข้าสู่ระบบ",
  invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  too_many_attempts: "ลองเข้าสู่ระบบอีกครั้งใน 15 นาที",
  service_unavailable: "ระบบยังไม่เปิดใช้งาน กรุณาลองภายหลัง",
  email_service_unavailable: "ระบบส่งอีเมลยังไม่พร้อมใช้งาน กรุณาลองภายหลัง",
  email_delivery_failed: "ส่งอีเมลไม่สำเร็จ กรุณาลองอีกครั้ง",
  code_send_limited: "ส่งรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง",
  code_expired: "รหัสหมดอายุแล้ว กรุณาเริ่มสมัครใหม่",
  invalid_code: "รหัสยืนยันไม่ถูกต้อง",
  too_many_code_attempts: "กรอกรหัสผิดหลายครั้ง กรุณาเริ่มสมัครใหม่",
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
            ? "ยืนยันอีเมลพาร์ทเนอร์"
            : register
              ? "สมัครบัญชีพาร์ทเนอร์"
              : "เข้าสู่ระบบพาร์ทเนอร์"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {verifyingEmail
            ? `กรอกรหัส 6 หลักที่ส่งไปยัง ${email ?? "อีเมลของคุณ"} ภายใน 10 นาที`
            : register
              ? "ยืนยันอีเมลก่อนสร้างบัญชี แล้วส่งข้อมูลธุรกิจและเอกสารเพื่อรอการตรวจสอบ"
              : "ติดตามสถานะใบสมัครและจัดการธุรกิจของคุณ"}
        </p>
        {!enabled && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {register
              ? "ยังไม่เปิดรับสมัครพาร์ทเนอร์ในขณะนี้ กรุณาลองใหม่ภายหลัง"
              : "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง"}
          </p>
        )}
        {verifyingEmail ? (
          <>
            <form action={verifyAction} className="mt-7 space-y-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="block text-sm font-medium">
                รหัสยืนยันจากอีเมล
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
                  {messages[verification.error] ??
                    "ยืนยันรหัสไม่สำเร็จ กรุณาลองอีกครั้ง"}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={verifying || !enabled}
                className="w-full"
              >
                {verifying ? "กำลังตรวจรหัส..." : "ยืนยันอีเมลและสร้างบัญชี"}
              </Button>
            </form>
            <form action={resendAction} className="mt-4 text-center text-sm">
              <button
                type="submit"
                disabled={resending || !enabled}
                className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                {resending ? "กำลังส่งรหัส..." : "ส่งรหัสอีกครั้ง"}
              </button>
              {resend.error && (
                <p role="alert" className="mt-2 text-destructive">
                  {messages[resend.error] ??
                    "ส่งรหัสไม่สำเร็จ กรุณาลองอีกครั้ง"}
                </p>
              )}
              {resend.message === "code_resent" && (
                <p role="status" className="mt-2 text-muted-foreground">
                  ส่งรหัสใหม่แล้ว กรุณาตรวจอีเมล
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
                เปลี่ยนอีเมล
              </button>
            </form>
          </>
        ) : (
          <form action={action} className="mt-7 space-y-5">
            <input type="hidden" name="locale" value={locale} />
            {register && (
              <label className="block text-sm font-medium">
                ชื่อผู้สมัคร
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
              อีเมล
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              รหัสผ่าน
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
                {messages[state.error] ?? "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง"}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={pending || !enabled}
              className="w-full"
            >
              {pending
                ? "กำลังดำเนินการ..."
                : register
                  ? "ส่งรหัสยืนยัน"
                  : "เข้าสู่ระบบ"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {register ? "มีบัญชีแล้ว? " : "ยังไม่มีบัญชี? "}
          <Link
            href={`/${locale}/${register ? "partner-login" : "partner-signup"}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {register ? "เข้าสู่ระบบ" : "สมัครพาร์ทเนอร์"}
          </Link>
        </p>
      </div>
    </main>
  );
}
