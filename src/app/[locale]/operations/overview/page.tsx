import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/server/staff-auth";
import { staffLoginPath } from "@/lib/staff-navigation";
import {
  commissionPolicy,
  partnerCounts,
  staffFinancials,
} from "@/lib/server/business-finance";
import {
  FinanceMetrics,
  FinanceFilters,
  FinanceModeNotice,
  FinanceEmpty,
  CommissionPanel,
  FinancialBookings,
} from "@/components/operations/finance-ui";
import { FinanceRefresh } from "@/components/operations/finance-controls";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { createTranslator } from "@/lib/i18n";
import { formatBaht } from "@/lib/finance";
export default async function BusinessOverview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    period?: string;
    mode?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params,
    filters = await searchParams,
    t = createTranslator(locale);
  const staff = await currentStaff();
  if (!staff) redirect(staffLoginPath(locale));
  const [finance, counts, policy] = await Promise.all([
    staffFinancials(staff.id, filters),
    partnerCounts(staff.id),
    commissionPolicy(),
  ]);
  return (
    <div className="business-page">
      <header className="business-heading">
        <div>
          <h1>{t("Business overview")}</h1>
          <p>{t("Partners, payments and revenue shares in one place.")}</p>
        </div>
        <FinanceFilters
          locale={locale}
          period={finance.period}
          mode={finance.mode}
          showSearch={false}
        />
      </header>
      <FinanceModeNotice locale={locale} mode={finance.mode} />
      <FinanceMetrics
        locale={locale}
        summary={finance.summary}
        partners={counts.total}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("Revenue by partner")}</CardTitle>
            <CardDescription>
              {counts.active} {t("active partners")} · {counts.pending}{" "}
              {t("awaiting review")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Company",
                    "Customer payments",
                    "Company commission",
                    "Partner share",
                  ].map((label) => (
                    <TableHead key={label}>{t(label)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {finance.companies.map((company) => (
                  <TableRow key={company.partner_id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary"
                        href={`/${locale}/operations/payments?partnerId=${company.partner_id}&period=${finance.period}&mode=${finance.mode}`}
                      >
                        {company.business_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatBaht(company.paid, locale)}</TableCell>
                    <TableCell>{formatBaht(company.company, locale)}</TableCell>
                    <TableCell>{formatBaht(company.partner, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {finance.companies.length === 0 && <FinanceEmpty locale={locale} />}
          </CardContent>
        </Card>
        <CommissionPanel
          locale={locale}
          bps={policy.commission_bps}
          admin={staff.role === "admin"}
        />
      </div>
      <FinancialBookings
        locale={locale}
        {...finance}
        admin={staff.role === "admin"}
      />
      <FinanceRefresh locale={locale} />
    </div>
  );
}
