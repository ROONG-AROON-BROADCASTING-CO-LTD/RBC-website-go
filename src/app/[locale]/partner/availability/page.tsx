import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { getActivePartner, getPartnerListings } from "@/lib/server/listings";
import { listAvailabilityBlocks } from "@/lib/server/workspace";
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
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const [partner, listings, blocks] = await Promise.all([
    getActivePartner(account.id),
    getPartnerListings(account.id),
    listAvailabilityBlocks(account.id),
  ]);
  if (!partner) redirect(`/${locale}/apply`);
  const t = (text: string) => translate(locale, text);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <Button variant="ghost" asChild className="self-start">
        <Link href={`/${locale}/partner/overview`}>{t("Partner portal")}</Link>
      </Button>
      <h1 className="text-3xl font-bold">{t("Availability calendar")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("Block vehicle availability")}</CardTitle>
          <CardDescription>
            {t(
              "Blocked periods cannot overlap held or confirmed bookings. Times are in Bangkok time.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceActionForm operation="block" label="Block dates">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="listingId">{t("Vehicle")}</FieldLabel>
                <select
                  id="listingId"
                  name="listingId"
                  required
                  className="h-11 w-full rounded-lg border bg-background px-3"
                >
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="startsAt">
                  {t("Start (Bangkok time)")}
                </FieldLabel>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="endsAt">
                  {t("End (Bangkok time)")}
                </FieldLabel>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reason">{t("Reason")}</FieldLabel>
                <Input id="reason" name="reason" maxLength={300} />
              </Field>
            </FieldGroup>
          </WorkspaceActionForm>
        </CardContent>
      </Card>
      {blocks.map((block) => (
        <Card key={block.id}>
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
            <CardDescription>
              {block.starts_at.toLocaleString(locale, {
                timeZone: "Asia/Bangkok",
              })}{" "}
              –{" "}
              {block.ends_at.toLocaleString(locale, {
                timeZone: "Asia/Bangkok",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>{block.reason}</p>
            <WorkspaceActionForm
              operation="unblock"
              values={{ blockId: block.id }}
              label="Reopen dates"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
