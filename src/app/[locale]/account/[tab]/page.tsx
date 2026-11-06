import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomerAccount from "@/components/customer/account";
import { AccountAccessForm } from "@/components/customer/account-access-form";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeading } from "@/components/rbc/common";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { currentAccount } from "@/lib/server/auth";
import { listCustomerPartnerBookings } from "@/lib/server/partner-bookings";
import {
  listCustomerPayments,
  listCustomerReviews,
  listSavedListings,
} from "@/lib/server/workspace";
import { translate, bookingStatusLabel } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";

export default async function AccountTabPage({
  params,
}: {
  params: Promise<{ locale: Locale; tab: string }>;
}) {
  const { locale, tab } = await params;
  const titles: Record<string, string> = {
    profile: "Customer details",
    bookings: "My Bookings",
    payments: "Payments",
    saved: "Saved items",
    messages: "Messages",
    reviews: "My reviews",
  };
  if (!titles[tab]) notFound();
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account)
    redirect(
      `/${locale}/email?next=${encodeURIComponent(`/${locale}/account/${tab}`)}`,
    );
  if (tab === "profile")
    return (
      <>
        {account.email && !account.email_verified_at && (
          <div className="mx-auto max-w-lg px-4 pt-6">
            <AccountAccessForm mode="request-verify" />
          </div>
        )}
        <CustomerAccount tab="profile" />
      </>
    );
  const t = (text: string) => translate(locale, text);
  const bookings = ["bookings", "messages", "reviews"].includes(tab)
    ? await listCustomerPartnerBookings(account.id)
    : [];
  const payments =
    tab === "payments" ? await listCustomerPayments(account.id) : [];
  const saved = tab === "saved" ? await listSavedListings(account.id) : [];
  const reviews =
    tab === "reviews" ? await listCustomerReviews(account.id) : [];
  const date = (value: Date) =>
    value.toLocaleString(
      locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
      { timeZone: "Asia/Bangkok" },
    );
  const money = (value: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "THB",
    }).format(Number(value) / 100);
  const visibleBookings = bookings.filter(
    (booking) =>
      tab !== "reviews" ||
      (booking.status === "completed" &&
        !reviews.some((review) => review.booking_id === booking.id)),
  );
  const empty =
    !visibleBookings.length &&
    !payments.length &&
    !saved.length &&
    !reviews.length;
  return (
    <WorkspaceShell role="account" tab={tab}>
      <PageHeading
        eyebrow="Customer account"
        title={titles[tab]}
        description="Your account activity is saved securely and available across devices."
      />
      <div className="flex flex-col gap-5">
        {empty && (
          <Card>
            <CardHeader>
              <CardTitle>{t("No records yet")}</CardTitle>
              <CardDescription>
                {t("Your activity will appear here.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={`/${locale}/search/boats`}>
                  {t("Start exploring")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {visibleBookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle>{booking.title}</CardTitle>
              <CardDescription>
                {booking.business_name} · {date(booking.starts_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {bookingStatusLabel(locale, booking.status)}
                </Badge>
                {Number(booking.total_satang) > 0 && (
                  <strong>{money(booking.total_satang)}</strong>
                )}
              </div>
              {tab === "reviews" ? (
                <WorkspaceActionForm
                  operation="review"
                  values={{ bookingId: booking.id }}
                  label="Submit review"
                >
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`rating-${booking.id}`}>
                        {t("Rating (1–5)")}
                      </FieldLabel>
                      <Input
                        id={`rating-${booking.id}`}
                        name="rating"
                        type="number"
                        min={1}
                        max={5}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`review-${booking.id}`}>
                        {t("Review")}
                      </FieldLabel>
                      <Textarea
                        id={`review-${booking.id}`}
                        name="body"
                        maxLength={2000}
                        required
                      />
                    </Field>
                  </FieldGroup>
                </WorkspaceActionForm>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/${locale}/partner-bookings/${booking.id}`}>
                      {t("View booking")}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/${locale}/messages/${booking.id}`}>
                      {t("Messages")}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {payments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <CardTitle>{payment.title}</CardTitle>
              <CardDescription>{date(payment.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Badge variant="secondary">{t(payment.status)}</Badge>
              <strong>{money(payment.amount_satang)}</strong>
              <Button asChild variant="outline">
                <Link
                  href={`/${locale}/partner-bookings/${payment.booking_id}`}
                >
                  {t("View booking")}
                </Link>
              </Button>
              {["succeeded", "refunded"].includes(payment.status) && (
                <Button asChild variant="outline">
                  <a
                    href={`/${locale}/partner-bookings/${payment.booking_id}/receipt`}
                  >
                    {t("Download receipt")}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {saved.map((listing) => (
          <Card key={listing.id}>
            <CardHeader>
              <CardTitle>
                <Link href={`/${locale}/listing/${listing.id}`}>
                  {listing.title}
                </Link>
              </CardTitle>
              <CardDescription>{listing.location_text}</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceActionForm
                operation="save"
                values={{ listingId: listing.id, saved: "false" }}
                label="Remove from saved"
              />
            </CardContent>
          </Card>
        ))}
        {reviews.map((review) => (
          <Card key={review.booking_id}>
            <CardHeader>
              <CardTitle>{review.title}</CardTitle>
              <CardDescription>{review.rating}/5</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{review.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}
