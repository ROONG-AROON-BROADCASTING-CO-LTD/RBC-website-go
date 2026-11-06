import { staffFinancials } from "@/lib/server/business-finance";
import {
  FinanceMetrics,
  FinanceModeNotice,
  FinancialBookings,
} from "@/components/operations/finance-ui";
import { FinanceRefresh } from "@/components/operations/finance-controls";
import { WithdrawalQueue } from "@/components/operations/withdrawal-queue";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentStaff } from "@/lib/server/staff-auth";
import { staffLoginPath } from "@/lib/staff-navigation";
import {
  listSettlementWorkspace,
  requireStaff,
} from "@/lib/server/settlements";
import { BookingError } from "@/lib/server/partner-bookings";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";

export default async function PaymentsWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    period?: string;
    mode?: string;
    q?: string;
    partnerId?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentStaff();
  if (!account) redirect(staffLoginPath(locale));
  let role, workspace;
  try {
    role = (await requireStaff(account.id)).role;
    workspace = await listSettlementWorkspace(account.id);
  } catch (error) {
    if (error instanceof BookingError) notFound();
    throw error;
  }
  const finance = await staffFinancials(account.id, await searchParams);
  const admin = role === "admin",
    t = (text: string) => translate(locale, text);
  const amount = (value: string | null) =>
    value
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "THB",
        }).format(Number(value) / 100)
      : "—";
  const providerField = (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="providerId">
          {t("Omise transaction ID")}
        </FieldLabel>
        <Input name="providerId" required />
      </Field>
    </FieldGroup>
  );
  return (
    <div className="business-page">
      <header className="business-heading">
        <div>
          <h1>{t("Finance and bookings")}</h1>
          <p>
            {t("Track actual payments, commissions and partner withdrawals.")}
          </p>
        </div>
      </header>
      <FinanceModeNotice locale={locale} mode={finance.mode} />
      <FinanceMetrics locale={locale} summary={finance.summary} />
      <WithdrawalQueue accountId={account.id} locale={locale} />
      <FinancialBookings locale={locale} {...finance} admin={admin} />
      <FinanceRefresh locale={locale} />
      <details>
        <summary className="text-lg font-semibold text-primary">
          {t("Refunds, reconciliation and payout accounts")}
        </summary>
        <div className="flex flex-col gap-6 pt-6">
          {admin && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Reconcile an Omise charge")}</CardTitle>
                <CardDescription>
                  {t(
                    "The amount, currency, booking reference and payment mode must match before confirmation.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkspaceActionForm
                  operation="charge-reconcile"
                  label="Check transaction"
                >
                  {providerField}
                </WorkspaceActionForm>
              </CardContent>
            </Card>
          )}
          <h2 className="text-2xl font-bold">{t("Refund requests")}</h2>
          {!workspace.refunds.length && <p>{t("No records yet")}</p>}
          {workspace.refunds.map((refund) => (
            <Card key={refund.id}>
              <CardHeader>
                <CardTitle>
                  {refund.booking_id.slice(0, 8)} · {t(refund.kind)}
                </CardTitle>
                <CardDescription>{refund.reason}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex gap-3">
                  <Badge variant="secondary">{t(refund.status)}</Badge>
                  <span>{amount(refund.amount_satang)}</span>
                </div>
                {admin && ["requested", "failed"].includes(refund.status) && (
                  <>
                    <WorkspaceActionForm
                      operation="refund-approve"
                      values={{ refundId: refund.id }}
                      label="Approve refund"
                    >
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor={`amount-${refund.id}`}>
                            {t("Refund amount (THB)")}
                          </FieldLabel>
                          <Input
                            id={`amount-${refund.id}`}
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                          />
                        </Field>
                      </FieldGroup>
                    </WorkspaceActionForm>
                    <WorkspaceActionForm
                      operation="refund-decline"
                      values={{ refundId: refund.id }}
                      label="Decline refund"
                    />
                  </>
                )}
                {admin && refund.status === "processing" && (
                  <WorkspaceActionForm
                    operation="refund-reconcile"
                    values={{ refundId: refund.id }}
                    label="Check transaction"
                  >
                    {providerField}
                  </WorkspaceActionForm>
                )}
              </CardContent>
            </Card>
          ))}
          <h2 className="text-2xl font-bold">{t("Bookings")}</h2>
          {workspace.bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle>{booking.title}</CardTitle>
                <CardDescription>
                  {booking.business_name} · {booking.customer_name} ·{" "}
                  {booking.id.slice(0, 8)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <Badge variant="secondary">{t(booking.status)}</Badge>
                  <strong>{amount(booking.total_satang)}</strong>
                </div>
                <Button asChild variant="outline" className="self-start">
                  <Link href={`/${locale}/messages/${booking.id}`}>
                    {t("Messages")}
                  </Link>
                </Button>
                {admin && booking.status === "completed" && (
                  <WorkspaceActionForm
                    operation="payout"
                    values={{ bookingId: booking.id }}
                    label="Pay partner"
                  />
                )}
              </CardContent>
            </Card>
          ))}
          <h2 className="text-2xl font-bold">{t("Partner payout accounts")}</h2>
          {workspace.partners.map((partner) => (
            <Card key={partner.id}>
              <CardHeader>
                <CardTitle>{partner.business_name}</CardTitle>
                <CardDescription>
                  {partner.recipient_id ?? t("No verified payout recipient")}
                </CardDescription>
              </CardHeader>
              {admin && (
                <CardContent>
                  <WorkspaceActionForm
                    operation="recipient"
                    values={{ partnerId: partner.id }}
                    label="Verify recipient"
                  >
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor={`recipient-${partner.id}`}>
                          {t("Omise recipient ID")}
                        </FieldLabel>
                        <Input
                          id={`recipient-${partner.id}`}
                          name="recipientId"
                          required
                        />
                      </Field>
                    </FieldGroup>
                  </WorkspaceActionForm>
                </CardContent>
              )}
            </Card>
          ))}
          <h2 className="text-2xl font-bold">{t("Payouts")}</h2>
          {workspace.payouts.map((payout) => (
            <Card key={payout.id}>
              <CardHeader>
                <CardTitle>
                  {payout.booking_id.slice(0, 8)} ·{" "}
                  {amount(payout.amount_satang)}
                </CardTitle>
                <CardDescription>{payout.recipient_id}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Badge variant="secondary">{t(payout.status)}</Badge>
                {admin && payout.status !== "paid" && (
                  <WorkspaceActionForm
                    operation="payout-reconcile"
                    values={{ payoutId: payout.id }}
                    label="Check transaction"
                  >
                    {providerField}
                  </WorkspaceActionForm>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </details>
    </div>
  );
}
