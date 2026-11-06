import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { getActivePartner } from "@/lib/server/listings";
import { getDb } from "@/lib/server/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTranslator } from "@/lib/i18n";
export default async function EarningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    t = createTranslator(locale);
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const partner = await getActivePartner(account.id);
  if (!partner) redirect(`/${locale}/apply`);
  const sql = getDb();
  const [payments, payouts] = await Promise.all([
    sql<
      {
        id: string;
        title: string;
        amount: string;
        deposit: string;
        status: string;
      }[]
    >`select bookings.id,listings.title,attempts.amount_satang::text as amount,bookings.deposit_satang::text as deposit,bookings.status
      from rbc_go.payment_attempts attempts join rbc_go.bookings bookings on bookings.id=attempts.booking_id
      join rbc_go.listings listings on listings.id=bookings.listing_id where listings.partner_id=${partner.id} and attempts.status in ('succeeded','refunded') order by attempts.created_at desc limit 100`,
    sql<
      {
        id: string;
        amount_satang: string;
        net_satang: string | null;
        fee_satang: string | null;
        status: string;
        created_at: Date;
      }[]
    >`select id,amount_satang::text,net_satang::text,fee_satang::text,status,created_at from rbc_go.payouts where partner_id=${partner.id} order by created_at desc limit 100`,
  ]);
  const money = (value: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "THB",
    }).format(Number(value) / 100);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-10">
      <Button asChild variant="ghost" className="self-start">
        <Link href={`/${locale}/partner/overview`}>{t("Partner portal")}</Link>
      </Button>
      <h1 className="text-3xl font-bold">{t("Earnings")}</h1>
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardHeader>
            <CardTitle>{payment.title}</CardTitle>
            <CardDescription>{payment.id.slice(0, 8)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Badge variant="secondary">{t(payment.status)}</Badge>
            <span>
              {t("Total including deposit")}: {money(payment.amount)}
            </span>
            <span>
              {t("Security deposit")}: {money(payment.deposit)}
            </span>
          </CardContent>
        </Card>
      ))}
      <h2 className="text-2xl font-bold">{t("Payouts")}</h2>
      {!payouts.length && <p>{t("No records yet")}</p>}
      {payouts.map((payout) => (
        <Card key={payout.id}>
          <CardHeader>
            <CardTitle>{money(payout.amount_satang)}</CardTitle>
            <CardDescription>
              {payout.created_at.toLocaleString(locale, {
                timeZone: "Asia/Bangkok",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{t(payout.status)}</Badge>
            {payout.net_satang !== null && (
              <p className="mt-3">
                {t("Net bank transfer")}: {money(payout.net_satang)}
              </p>
            )}
            {payout.fee_satang !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Gateway transfer fees")}: {money(payout.fee_satang)}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
