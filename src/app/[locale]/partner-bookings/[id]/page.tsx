import { createTranslator } from "@/lib/i18n";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { currentAccount } from "@/lib/server/auth";
import {
  getCustomerPartnerBooking,
  getCustomerPaymentState,
  partnerBookingPaymentAvailability,
} from "@/lib/server/partner-bookings";
import { PaymentStatusCheck } from "@/components/customer/payment-status-check";
import { omiseConfigured, omiseMode } from "@/lib/server/omise";
import { OmiseBookingPayment } from "@/components/customer/omise-booking-payment";
import { CancelPartnerBookingButton } from "@/components/customer/cancel-partner-booking-button";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import { listCustomerRefunds } from "@/lib/server/settlements";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
export const dynamic = "force-dynamic";
export default async function PartnerBookingDetail({
  params,
}: {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}) {
  const t = createTranslator((await params).locale);
  const { locale, id } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account)
    redirect(
      `/${locale}/email?next=${encodeURIComponent(`/${locale}/partner-bookings/${id}`)}`,
    );
  const booking = await getCustomerPartnerBooking(account.id, id);
  if (!booking) notFound();
  const paymentState = await getCustomerPaymentState(account.id, id);
  const refunds = await listCustomerRefunds(account.id, id);
  const { displayStatus, canPay } = partnerBookingPaymentAvailability(
    booking,
    paymentState,
  );
  const statusLabels: Record<string, string> = {
    requested: t("Awaiting partner quote"),
    held: t("Awaiting payment"),
    confirmed: t("Booking confirmed"),
    declined: t("Partner declined the request"),
    cancelled: t("Cancelled"),
    expired: t("Quote expired"),
    completed: t("Completed"),
  };
  const amount = (Number(booking.total_satang) / 100).toLocaleString(
    locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
    {
      minimumFractionDigits: 2,
    },
  );
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Button asChild variant="ghost">
        <Link href={`/${locale}/partner-bookings`}>
          {t("\u2190 My Bookings")}
        </Link>
      </Button>
      <div className="mt-5 rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold text-primary">
          {t("Booking request #")}
          {booking.id.slice(0, 8)}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{booking.title}</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/${locale}/messages/${booking.id}`}>
            {t("Messages")}
          </Link>
        </Button>
        <p className="mt-1 text-muted-foreground">{booking.business_name}</p>
        <p className="mt-5 rounded-xl bg-secondary p-4 font-semibold">
          {t(statusLabels[displayStatus] ?? displayStatus)}
        </p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("Service starts")}
            </dt>
            <dd>
              {booking.starts_at.toLocaleString(
                locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
                {
                  timeZone: "Asia/Bangkok",
                },
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("Service ends")}
            </dt>
            <dd>
              {booking.ends_at.toLocaleString(
                locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
                {
                  timeZone: "Asia/Bangkok",
                },
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("Contact person")}
            </dt>
            <dd>{booking.traveler_snapshot.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("Travelers")}</dt>
            <dd>
              {booking.traveler_snapshot.guests}
              {" "}
              {t("guests")}
            </dd>
          </div>
        </dl>
        {booking.status === "held" || booking.status === "confirmed" ? (
          <div className="mt-7 border-t pt-5">
            <p className="text-sm text-muted-foreground">
              {t("Total including deposit")}
            </p>
            <p className="mt-1 text-2xl font-bold">฿{amount}</p>
            {Number(booking.deposit_satang) > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Includes deposit \u0E3F")}
                {(Number(booking.deposit_satang) / 100).toLocaleString(
                  locale === "th"
                    ? "th-TH"
                    : locale === "zh"
                      ? "zh-CN"
                      : "en-GB",
                  { minimumFractionDigits: 2 },
                )}
              </p>
            )}
            {booking.status === "held" && booking.hold_expires_at && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Pay by")}{" "}
                {booking.hold_expires_at.toLocaleString(
                  locale === "th"
                    ? "th-TH"
                    : locale === "zh"
                      ? "zh-CN"
                      : "en-GB",
                  {
                    timeZone: "Asia/Bangkok",
                  },
                )}
              </p>
            )}
          </div>
        ) : null}
        {canPay && omiseConfigured() && (
          <div className="mt-6">
            <OmiseBookingPayment
              bookingId={booking.id}
              amountSatang={Number(booking.total_satang)}
              publicKey={process.env.OMISE_PUBLIC_KEY!}
              testMode={omiseMode() !== "live"}
            />
          </div>
        )}
        {canPay && !omiseConfigured() && (
          <p className="mt-5 text-sm text-muted-foreground">
            {t("Payments are unavailable. Please contact support.")}
          </p>
        )}
        {booking.status === "held" && paymentState === "pending" && (
          <div>
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {t(
                "Omise is confirming your payment. Check this page again shortly.",
              )}
            </p>
            <PaymentStatusCheck bookingId={booking.id} />
          </div>
        )}
        {booking.status === "held" && paymentState === "created" && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            {t(
              "We are checking this payment. Contact support before retrying to avoid duplicate charges.",
            )}
          </p>
        )}
        {(displayStatus === "requested" || displayStatus === "held") && (
          <div className="mt-6">
            <CancelPartnerBookingButton bookingId={booking.id} />
          </div>
        )}
        {(booking.status === "confirmed" || booking.status === "completed") &&
          !refunds.some((refund) =>
            ["requested", "processing"].includes(refund.status),
          ) && (
            <div className="mt-7 border-t pt-5">
              <WorkspaceActionForm
                operation="refund-request"
                values={{
                  bookingId: id,
                  kind:
                    booking.status === "completed" ? "deposit" : "cancellation",
                }}
                label={
                  booking.status === "completed"
                    ? "Request deposit return"
                    : "Request cancellation and refund"
                }
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="refund-reason">
                      {t("Reason")}
                    </FieldLabel>
                    <Textarea
                      id="refund-reason"
                      name="reason"
                      maxLength={1000}
                      required
                    />
                  </Field>
                </FieldGroup>
              </WorkspaceActionForm>
            </div>
          )}
        {refunds.map((refund) => (
          <p key={refund.id} className="mt-4 text-sm">
            {t(refund.kind)} · {t(refund.status)}
            {refund.amount_satang
              ? ` · ฿${Number(refund.amount_satang) / 100}`
              : ""}
          </p>
        ))}
      </div>
    </main>
  );
}
