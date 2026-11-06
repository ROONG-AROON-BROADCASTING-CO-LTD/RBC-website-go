import Link from "next/link";
import { getDb } from "@/lib/server/db";
import { partnerCounts } from "@/lib/server/business-finance";
import { requireStaff } from "@/lib/server/settlements";
import { createTranslator } from "@/lib/i18n";
import { partnerCategoryLabel } from "@/lib/partner-categories";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FinanceEmpty } from "./finance-ui";
import { FinanceSelect } from "./finance-controls";
export async function PartnerDirectory({
  accountId,
  locale,
  q = "",
  status = "all",
  page = "1",
}: {
  accountId: string;
  locale: string;
  q?: string;
  status?: string;
  page?: string;
}) {
  const staff = await requireStaff(accountId);
  if (staff.role === "support") return null;
  const t = createTranslator(locale),
    sql = getDb(),
    query = q.trim().slice(0, 120),
    selected = ["active", "suspended"].includes(status) ? status : "all",
    current = Math.max(1, Number.parseInt(page, 10) || 1);
  const where = sql`(${selected}='all' or p.status=${selected}) and (${query}='' or strpos(lower(p.business_name),lower(${query}))>0 or strpos(lower(coalesce(a.email,'')),lower(${query}))>0)`;
  const [counts, partners, total] = await Promise.all([
    partnerCounts(accountId),
    sql<
      {
        id: string;
        business_name: string;
        status: string;
        email: string;
        display_name: string;
        rental_categories: string[];
        vehicles: number;
      }[]
    >`
    select p.id,p.business_name,p.status,a.email,a.display_name,app.rental_categories,
    (select count(*)::integer from rbc_go.listings where partner_id=p.id) as vehicles
    from rbc_go.partners p join rbc_go.accounts a on a.id=p.owner_account_id join rbc_go.partner_applications app on app.id=p.application_id
    where ${where} order by p.created_at desc,p.id limit 20 offset ${(current - 1) * 20}`,
    sql<
      { count: number }[]
    >`select count(*)::integer as count from rbc_go.partners p join rbc_go.accounts a on a.id=p.owner_account_id where ${where}`,
  ]);
  const href = (p: number) =>
    `?${new URLSearchParams({ q: query, status: selected, page: String(p) })}`;
  return (
    <>
      <div className="finance-metrics">
        {[
          ["Total partners", counts.total, "primary"],
          ["Active partners", counts.active, "received"],
          ["Awaiting review", counts.pending, "company"],
          ["Suspended partners", counts.suspended, "partner"],
        ].map(([label, value, tone]) => (
          <section key={label} className="finance-metric" data-tone={tone}>
            <div>
              <h2>{t(String(label))}</h2>
              <p className="finance-metric-value">{value}</p>
            </div>
          </section>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("Partner directory")}</CardTitle>
          <CardDescription>
            {t("Approved businesses and their current status")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <form method="get" className="flex flex-1 items-end gap-2">
              <input type="hidden" name="status" value={selected} />
              <Field>
                <FieldLabel htmlFor="partner-search" className="sr-only">
                  {t("Search company or email")}
                </FieldLabel>
                <Input
                  id="partner-search"
                  name="q"
                  defaultValue={query}
                  placeholder={t("Search company or email")}
                />
              </Field>
              <Button variant="outline" type="submit">
                {t("Search")}
              </Button>
            </form>
            <FinanceSelect
              name="status"
              value={selected}
              label={t("Partner status")}
              options={[
                { value: "all", label: t("All statuses") },
                { value: "active", label: t("active") },
                { value: "suspended", label: t("suspended") },
              ]}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Company",
                  "Contact",
                  "Rental categories",
                  "Vehicle listings",
                  "Status",
                  "Details",
                ].map((label) => (
                  <TableHead key={label}>{t(label)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">
                    {p.business_name}
                  </TableCell>
                  <TableCell>
                    <p>{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </TableCell>
                  <TableCell>
                    {p.rental_categories
                      .map((c) => t(partnerCategoryLabel(c)))
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell>{p.vehicles}</TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "active" ? "success" : "warning"}
                    >
                      {t(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="link" asChild>
                      <Link
                        href={`/${locale}/operations/payments?partnerId=${p.id}&period=all`}
                      >
                        {t("View revenue")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {partners.length === 0 && (
            <FinanceEmpty
              locale={locale}
              title={query ? "No matching records" : "No approved partners yet"}
              description="Approve partner applications below to add businesses to this directory."
            />
          )}
          <div className="flex items-center justify-between text-sm">
            <span>
              {total[0].count} {t("records")}
            </span>
            <div className="flex gap-3">
              {current > 1 && (
                <Link href={href(current - 1)}>{t("Previous")}</Link>
              )}
              {current * 20 < total[0].count && (
                <Link href={href(current + 1)}>{t("Next")}</Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
