import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { getActivePartner } from "@/lib/server/listings";
import { partnerFinancials } from "@/lib/server/business-finance";
import {
  FinanceMetrics,
  FinanceModeNotice,
  FinancialBookings,
} from "@/components/operations/finance-ui";
import { FinanceRefresh } from "@/components/operations/finance-controls";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WalletCards } from "lucide-react";
import { createTranslator } from "@/lib/i18n";
export default async function EarningsPage({
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
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const partner = await getActivePartner(account.id);
  if (!partner) redirect(`/${locale}/apply`);
  const finance = await partnerFinancials(account.id, filters);
  return (
    <div className="business-theme">
      <div className="business-page">
        <header className="business-heading">
          <div>
            <h1>{t("Earnings and withdrawals")}</h1>
            <p>
              {partner.business_name} ·{" "}
              {t("Your share of confirmed customer payments")}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/partner/overview`}>
              {t("Partner portal")}
            </Link>
          </Button>
        </header>
        <FinanceModeNotice locale={locale} mode={finance.mode} />
        <FinanceMetrics locale={locale} summary={finance.summary} partnerView />
        <Alert>
          <WalletCards />
          <AlertTitle>{t("How withdrawals work")}</AlertTitle>
          <AlertDescription>
            {t(
              "Payments appear after gateway confirmation. Once the booking is completed, the deposit is returned and your payout account is verified, open Details and request withdrawal. Staff review the request before transferring to your verified bank account. Only the business owner can request a withdrawal.",
            )}
          </AlertDescription>
        </Alert>
        <FinancialBookings
          locale={locale}
          {...finance}
          partnerView
          canWithdraw={partner.role === "owner"}
        />
        <FinanceRefresh locale={locale} />
      </div>
    </div>
  );
}
