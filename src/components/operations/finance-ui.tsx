import Link from "next/link";
import {
  Building2,
  CreditCard,
  Coins,
  HandCoins,
  Inbox,
  ArrowDownToLine,
  Clock3,
  Search,
  Info,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import { FinanceSelect } from "./finance-controls";
import { createTranslator, bookingStatusLabel } from "@/lib/i18n";
import { formatBaht } from "@/lib/finance";
import type {
  FinancialBooking,
  FinanceSummary,
} from "@/lib/server/business-finance";
export function FinanceEmpty({
  locale,
  title = "No confirmed payments yet",
  description = "Confirmed payments will appear here automatically.",
}: {
  locale: string;
  title?: string;
  description?: string;
}) {
  const t = createTranslator(locale);
  return (
    <Empty className="min-h-40">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{t(title)}</EmptyTitle>
        <EmptyDescription>{t(description)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function FinanceMetrics({
  locale,
  summary,
  partners,
  partnerView = false,
}: {
  locale: string;
  summary: FinanceSummary;
  partners?: number;
  partnerView?: boolean;
}) {
  const t = createTranslator(locale),
    money = (v: string | null) => formatBaht(v, locale);
  const metrics = partnerView
    ? [
        {
          label: "Awaiting receipt",
          value: money(summary.awaiting),
          icon: Clock3,
          tone: "partner",
          note: "After commission, before transfer fees",
        },
        {
          label: "Available to withdraw",
          value: money(summary.available),
          icon: HandCoins,
          tone: "received",
          note: "Completed bookings with deposits returned",
        },
        {
          label: "Withdrawal requested",
          value: money(summary.requested),
          icon: ArrowDownToLine,
          tone: "company",
          note: "Awaiting approval or bank transfer",
        },
        {
          label: "Transferred",
          value: money(summary.transferred),
          icon: CreditCard,
          tone: "primary",
          note: "Confirmed by the payment gateway",
        },
      ]
    : [
        {
          label: partners === undefined ? "Paid bookings" : "Total partners",
          value: String(partners ?? summary.count),
          icon: Building2,
          tone: "primary",
          note:
            partners === undefined
              ? "Gateway-confirmed payments"
              : "Approved businesses, all statuses",
        },
        {
          label: "Customer payments",
          value: money(summary.paid),
          icon: CreditCard,
          tone: "received",
          note: "Includes security deposits",
        },
        {
          label: "Company commission",
          value: money(summary.company),
          icon: Coins,
          tone: "company",
          note: "After refunds, before gateway fees",
        },
        {
          label: "Partner share",
          value: money(summary.partner),
          icon: HandCoins,
          tone: "partner",
          note: "After commission, before transfer fees",
        },
      ];
  return (
    <div className="finance-metrics">
      {metrics.map(({ label, value, icon: Icon, tone, note }) => (
        <section key={label} className="finance-metric" data-tone={tone}>
          <span className="finance-metric-icon">
            <Icon aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2>{t(label)}</h2>
            <p className="finance-metric-value">{value}</p>
            <p className="finance-metric-note">{t(note)}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
export function FinanceFilters({
  locale,
  period,
  mode,
  q = "",
  partnerId,
  showSearch = true,
}: {
  locale: string;
  period: string;
  mode: string;
  q?: string;
  partnerId?: string | null;
  showSearch?: boolean;
}) {
  const t = createTranslator(locale);
  return (
    <div className="flex flex-wrap items-end gap-3">
      {showSearch && (
        <form
          method="get"
          className="flex min-w-0 basis-full items-end gap-2 sm:flex-1"
        >
          <input type="hidden" name="period" value={period} />
          <input type="hidden" name="mode" value={mode} />
          {partnerId && (
            <input type="hidden" name="partnerId" value={partnerId} />
          )}
          <Field className="min-w-0">
            <FieldLabel className="sr-only" htmlFor="finance-search">
              {t("Search booking or company")}
            </FieldLabel>
            <Input
              id="finance-search"
              name="q"
              defaultValue={q}
              placeholder={t("Search booking or company")}
              maxLength={120}
            />
          </Field>
          <Button variant="outline" type="submit" aria-label={t("Search")}>
            <Search data-icon="inline-start" />
          </Button>
        </form>
      )}
      <FinanceSelect
        name="period"
        value={period}
        label={t("Reporting period")}
        options={[
          { value: "month", label: t("This month") },
          { value: "30d", label: t("Last 30 days") },
          { value: "all", label: t("All time") },
        ]}
      />
      <FinanceSelect
        name="mode"
        value={mode}
        label={t("Payment mode")}
        options={[
          { value: "live", label: t("Live payments") },
          { value: "test", label: t("Test payments") },
        ]}
      />
    </div>
  );
}
export function FinanceModeNotice({
  locale,
  mode,
}: {
  locale: string;
  mode: string;
}) {
  const t = createTranslator(locale);
  return mode === "test" ? (
    <Alert>
      <Info />
      <AlertDescription>
        {t(
          "Test mode: these amounts are sandbox transactions, not real money.",
        )}
      </AlertDescription>
    </Alert>
  ) : null;
}
export function FinancialBookings({
  locale,
  rows,
  summary,
  page,
  period,
  mode,
  q,
  partnerId,
  partnerView = false,
  canWithdraw = false,
  admin = false,
}: {
  locale: string;
  rows: FinancialBooking[];
  summary: FinanceSummary;
  page: number;
  period: string;
  mode: string;
  q: string;
  partnerId?: string | null;
  partnerView?: boolean;
  admin?: boolean;
  canWithdraw?: boolean;
}) {
  const t = createTranslator(locale),
    money = (v: string | null) => formatBaht(v, locale);
  function pageHref(next: number) {
    const search = new URLSearchParams({ period, mode, q, page: String(next) });
    if (partnerId && !partnerView) search.set("partnerId", partnerId);
    return `?${search}`;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Paid bookings")}</CardTitle>
        <CardDescription>
          {summary.count} {t("records")} ·{" "}
          {t("Amounts reflect confirmed payments and successful refunds.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FinanceFilters {...{ locale, period, mode, q, partnerId }} />
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Booking",
                ...(!partnerView ? ["Partner"] : []),
                "Customer payments",
                "Commission",
                "Company share",
                "Partner share",
                "Status",
              ].map((label) => (
                <TableHead key={label}>{t(label)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="max-w-48 truncate font-medium">{row.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {row.id.slice(0, 8)}
                  </span>
                </TableCell>
                {!partnerView && (
                  <TableCell>
                    <Link
                      href={`/${locale}/operations/payments?partnerId=${row.partner_id}&period=all&mode=${mode}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {row.business_name}
                    </Link>
                  </TableCell>
                )}
                <TableCell className="tabular-nums">
                  {money(row.paid_satang)}
                </TableCell>
                <TableCell>{row.commission_bps / 100}%</TableCell>
                <TableCell className="tabular-nums">
                  {money(row.company_satang)}
                </TableCell>
                <TableCell className="tabular-nums font-semibold">
                  {money(row.partner_satang)}
                </TableCell>
                <TableCell>
                  <details className="finance-details">
                    <summary>
                      <Badge
                        variant={
                          row.payout_status === "paid"
                            ? "success"
                            : row.withdrawal_id
                              ? "warning"
                              : row.withdrawable
                                ? "info"
                                : "secondary"
                        }
                      >
                        {t(
                          row.payout_status === "paid"
                            ? "Transferred"
                            : row.payout_status === "failed"
                              ? "Transfer failed"
                              : row.payout_status === "pending" ||
                                  row.payout_status === "processing"
                                ? "Transfer in progress"
                                : Number(row.refunded_satang) >=
                                    Number(row.paid_satang)
                                  ? "Refunded"
                                  : row.refund_pending
                                    ? "Refund in progress"
                                    : row.withdrawal_id
                                      ? "Withdrawal requested"
                                      : row.withdrawable
                                        ? "Available to withdraw"
                                        : Number(row.partner_satang) === 0
                                          ? "No balance to withdraw"
                                          : "Awaiting receipt",
                        )}
                      </Badge>
                      <span className="text-xs text-primary">
                        {t("Details")}
                      </span>
                    </summary>
                    <dl className="finance-breakdown">
                      {[
                        [
                          "Booking status",
                          bookingStatusLabel(locale, row.status),
                        ],
                        ["Rental after refunds", money(row.rental_satang)],
                        ["Refunded", money(row.refunded_satang)],
                        ["Deposit held", money(row.deposit_held_satang)],
                        [
                          "Net bank transfer",
                          money(
                            row.payout_status === "paid"
                              ? row.bank_net_satang
                              : null,
                          ),
                        ],
                        [
                          "Gateway transfer fees",
                          money(row.transfer_fee_satang),
                        ],
                        ["Gateway charge", row.charge_reference ?? "—"],
                        [
                          "Bank transfer reference",
                          row.transfer_reference ?? "—",
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{t(label)}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {row.refund_pending && (
                      <p className="text-sm text-warning">
                        {t("Refund in progress")}
                      </p>
                    )}
                    {!row.recipient_ready && (
                      <p className="text-sm text-warning">
                        {t("No verified payout recipient")}
                      </p>
                    )}
                    {partnerView && canWithdraw && row.withdrawable && (
                      <WorkspaceActionForm
                        operation="withdrawal-request"
                        values={{ bookingId: row.id }}
                        label="Request withdrawal"
                      />
                    )}
                    {admin &&
                      row.withdrawal_id &&
                      (!row.payout_status ||
                        (row.payout_status === "failed" &&
                          !row.transfer_reference)) && (
                        <WorkspaceActionForm
                          operation="payout"
                          values={{ bookingId: row.id }}
                          label="Approve withdrawal"
                        />
                      )}
                    <Button variant="link" asChild>
                      <Link href={`/${locale}/messages/${row.id}`}>
                        {t("Messages")}
                      </Link>
                    </Button>
                  </details>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <FinanceEmpty
            locale={locale}
            title={q ? "No matching records" : "No confirmed payments yet"}
          />
        )}
        {summary.count > 20 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={pageHref(page - 1)}>{t("Previous")}</Link>
              ) : (
                t("Previous")
              )}
            </Button>
            <span className="text-sm">
              {page} / {Math.ceil(summary.count / 20)}
            </span>
            <Button
              variant="outline"
              disabled={page * 20 >= summary.count}
              asChild={page * 20 < summary.count}
            >
              {page * 20 < summary.count ? (
                <Link href={pageHref(page + 1)}>{t("Next")}</Link>
              ) : (
                t("Next")
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function CommissionPanel({
  locale,
  bps,
  admin,
}: {
  locale: string;
  bps: number;
  admin: boolean;
}) {
  const t = createTranslator(locale),
    percent = bps / 100;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("Commission policy")} {percent}%
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="commission-bar"
          role="img"
          aria-label={`${t("Company share")} ${percent}%, ${t("Partner share")} ${100 - percent}%`}
        >
          <span style={{ width: `${percent}%` }} />
          <span style={{ width: `${100 - percent}%` }} />
        </div>
        <dl className="commission-example">
          <div>
            <dt>{t("Example rental")}</dt>
            <dd>{formatBaht(1000000, locale)}</dd>
          </div>
          <div>
            <dt>
              {t("Company share")} ({percent}%)
            </dt>
            <dd>{formatBaht(100 * bps, locale)}</dd>
          </div>
          <div>
            <dt>
              {t("Partner share")} ({100 - percent}%)
            </dt>
            <dd>{formatBaht(1000000 - 100 * bps, locale)}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          {t("Excludes security deposits and transfer fees.")}
        </p>
        {admin && (
          <details>
            <summary className="text-sm font-medium text-primary">
              {t("Change commission rate")}
            </summary>
            <div className="pt-4">
              <WorkspaceActionForm
                operation="commission-policy"
                label="Save commission rate"
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="commission-percent">
                      {t("Commission (%)")}
                    </FieldLabel>
                    <Input
                      id="commission-percent"
                      name="percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue={percent}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Applies to new quotes only. Existing booking rates stay unchanged.",
                      )}
                    </p>
                  </Field>
                </FieldGroup>
              </WorkspaceActionForm>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
