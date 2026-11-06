import { getDb } from "@/lib/server/db";
import { requireStaff } from "@/lib/server/settlements";
import { createTranslator } from "@/lib/i18n";
import { formatBaht } from "@/lib/finance";
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
  TableRow,
  TableHead,
  TableHeader,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import { FinanceEmpty } from "./finance-ui";
export async function WithdrawalQueue({
  accountId,
  locale,
}: {
  accountId: string;
  locale: string;
}) {
  const staff = await requireStaff(accountId),
    t = createTranslator(locale);
  const rows = await getDb()<
    {
      id: string;
      business_name: string;
      partner_satang: string;
      livemode: boolean;
      payout_status: string | null;
      transfer_reference: string | null;
      withdrawal_requested_at: Date;
    }[]
  >`
    select id,business_name,partner_satang::text,livemode,payout_status,transfer_reference,withdrawal_requested_at
    from rbc_go.booking_financials where withdrawal_id is not null and (payout_status is null or payout_status<>'paid')
    order by withdrawal_requested_at asc limit 50`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Withdrawal requests")}</CardTitle>
        <CardDescription>
          {t(
            "Oldest 50 open requests, across all reporting periods. Transfer fees are deducted by the gateway.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Company",
                "Booking",
                "Partner share",
                "Payment mode",
                "Status",
                "Actions",
              ].map((label) => (
                <TableHead key={label}>{t(label)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.business_name}</TableCell>
                <TableCell>{row.id.slice(0, 8)}</TableCell>
                <TableCell>{formatBaht(row.partner_satang, locale)}</TableCell>
                <TableCell>
                  <Badge variant={row.livemode ? "success" : "warning"}>
                    {t(row.livemode ? "Live payments" : "Test payments")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {t(row.payout_status ?? "Awaiting approval")}
                </TableCell>
                <TableCell>
                  {staff.role === "admin" &&
                  (!row.payout_status ||
                    (row.payout_status === "failed" &&
                      !row.transfer_reference)) ? (
                    <WorkspaceActionForm
                      operation="payout"
                      values={{ bookingId: row.id }}
                      label="Approve withdrawal"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("Awaiting gateway confirmation")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length && (
          <FinanceEmpty
            locale={locale}
            title="No withdrawal requests"
            description="Partner withdrawal requests will appear here for review."
          />
        )}
      </CardContent>
    </Card>
  );
}
