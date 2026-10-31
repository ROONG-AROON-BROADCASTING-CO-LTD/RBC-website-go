import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { currentAccount } from "@/lib/server/auth";
import {
  getCustomerPartnerBooking,
  getCustomerPaymentState,
} from "@/lib/server/partner-bookings";
import { refreshBookingPayment } from "@/lib/server/booking-payments";
import { omiseTestConfigured } from "@/lib/server/omise";
import { OmiseBookingPayment } from "@/components/customer/omise-booking-payment";
import { CancelPartnerBookingButton } from "@/components/customer/cancel-partner-booking-button";

export const dynamic = "force-dynamic";

export default async function PartnerBookingDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account)
    redirect(
      `/${locale}/email?next=${encodeURIComponent(`/${locale}/partner-bookings/${id}`)}`,
    );
  let booking = await getCustomerPartnerBooking(account.id, id);
  if (!booking) notFound();
  if (booking.status === "held") {
    try {
      await refreshBookingPayment(account.id, id);
    } catch {
      /* status remains pending for later reconciliation */
    }
    booking = await getCustomerPartnerBooking(account.id, id);
    if (!booking) notFound();
  }
  const paymentState = await getCustomerPaymentState(account.id, id);
  const displayStatus =
    booking.status === "held" &&
    !paymentState &&
    booking.hold_expires_at &&
    booking.hold_expires_at.getTime() <= Date.now()
      ? "expired"
      : booking.status;
  const statusLabels: Record<string, string> = {
    requested: "รอพาร์ทเนอร์เสนอราคา",
    held: "รอชำระเงิน",
    confirmed: "ยืนยันการจองแล้ว",
    declined: "พาร์ทเนอร์ไม่รับคำขอ",
    cancelled: "ยกเลิกแล้ว",
    expired: "ข้อเสนอหมดอายุ",
    completed: "เสร็จสิ้น",
  };
  const amount = (Number(booking.total_satang) / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
  });
  const canPay =
    displayStatus === "held" &&
    !paymentState &&
    booking.hold_expires_at &&
    booking.hold_expires_at.getTime() > Date.now();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/partner-bookings`}>← การจองของฉัน</Link>
      </Button>
      <div className="mt-5 rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold text-primary">
          คำขอจอง #{booking.id.slice(0, 8)}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{booking.title}</h1>
        <p className="mt-1 text-muted-foreground">{booking.business_name}</p>
        <p className="mt-5 rounded-xl bg-secondary p-4 font-semibold">
          {statusLabels[displayStatus] ?? displayStatus}
        </p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">เริ่มใช้บริการ</dt>
            <dd>
              {booking.starts_at.toLocaleString("th-TH", {
                timeZone: "Asia/Bangkok",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">สิ้นสุด</dt>
            <dd>
              {booking.ends_at.toLocaleString("th-TH", {
                timeZone: "Asia/Bangkok",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">ผู้ติดต่อ</dt>
            <dd>{booking.traveler_snapshot.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">ผู้เดินทาง</dt>
            <dd>{booking.traveler_snapshot.guests} คน</dd>
          </div>
        </dl>
        {booking.status === "held" || booking.status === "confirmed" ? (
          <div className="mt-7 border-t pt-5">
            <p className="text-sm text-muted-foreground">
              ยอดชำระรวมเงินประกัน
            </p>
            <p className="mt-1 text-2xl font-bold">฿{amount}</p>
            {Number(booking.deposit_satang) > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                รวมเงินประกัน ฿
                {(Number(booking.deposit_satang) / 100).toLocaleString(
                  "th-TH",
                  { minimumFractionDigits: 2 },
                )}
              </p>
            )}
            {booking.status === "held" && booking.hold_expires_at && (
              <p className="mt-1 text-sm text-muted-foreground">
                ชำระภายใน{" "}
                {booking.hold_expires_at.toLocaleString("th-TH", {
                  timeZone: "Asia/Bangkok",
                })}
              </p>
            )}
          </div>
        ) : null}
        {canPay && omiseTestConfigured() && (
          <div className="mt-6">
            <OmiseBookingPayment
              bookingId={booking.id}
              amountSatang={Number(booking.total_satang)}
              publicKey={process.env.OMISE_PUBLIC_KEY!}
            />
          </div>
        )}
        {canPay && !omiseTestConfigured() && (
          <p className="mt-5 text-sm text-muted-foreground">
            ระบบชำระเงินทดสอบยังไม่พร้อม กรุณาติดต่อทีมงาน
          </p>
        )}
        {booking.status === "held" && paymentState === "pending" && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Omise กำลังยืนยันรายการชำระเงิน กลับมาตรวจสถานะหน้านี้อีกครั้ง
          </p>
        )}
        {booking.status === "held" && paymentState === "created" && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            กำลังตรวจสอบรายการชำระเงิน
            กรุณาติดต่อทีมงานก่อนลองใหม่เพื่อป้องกันการเรียกเก็บซ้ำ
          </p>
        )}
        {(displayStatus === "requested" || displayStatus === "held") && (
          <div className="mt-6">
            <CancelPartnerBookingButton bookingId={booking.id} />
          </div>
        )}
      </div>
    </main>
  );
}
