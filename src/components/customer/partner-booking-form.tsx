"use client";
import { useRBC } from "@/components/rbc/provider";
import { useActionState } from "react";
import Link from "next/link";
import { submitBookingRequest } from "@/app/[locale]/listing/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const messages: Record<string, string> = {
  invalid_dates:
    "Check your dates in Bangkok time. Book at least 1 hour ahead for up to 31 days.",
  invalid_traveler: "Check your name, email and number of travelers.",
  dates_unavailable: "These dates are unavailable. Choose another time.",
  listing_unavailable: "This vehicle is not accepting booking requests.",
  sign_in_required: "Sign in before requesting a booking.",
};
export function PartnerBookingForm({
  locale,
  listingId,
  capacity,
  account,
}: {
  locale: string;
  listingId: string;
  capacity: number;
  account: {
    display_name: string;
    email: string | null;
    traveler_phone: string | null;
  } | null;
}) {
  const { t } = useRBC();
  const [state, action, pending] = useActionState(submitBookingRequest, {
    error: "",
  });
  if (!account)
    return (
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">{t("Request a booking")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Sign in to choose your dates and request a quote from the partner.",
          )}
        </p>
        <Button asChild className="mt-4">
          <Link
            href={`/${locale}/email?next=${encodeURIComponent(`/${locale}/listing/${listingId}`)}`}
          >
            {t("Sign In")}
          </Link>
        </Button>
      </div>
    );
  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <h2 className="text-xl font-semibold">{t("Request a booking")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "The partner will check availability and confirm your final price before payment.",
          )}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {t("Start (Bangkok time)")}
          <Input
            name="startsAt"
            type="datetime-local"
            required
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          {t("End (Bangkok time)")}
          <Input
            name="endsAt"
            type="datetime-local"
            required
            className="mt-2"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {t("Contact name")}
          <Input
            name="name"
            required
            minLength={2}
            maxLength={150}
            defaultValue={account.display_name}
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          {t("Email")}
          <Input
            name="email"
            type="email"
            required
            defaultValue={account.email ?? ""}
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          {t("Phone (optional)")}
          <Input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={account.traveler_phone ?? ""}
            className="mt-2"
          />
        </label>
        <label className="text-sm font-medium">
          {t("Number of travelers")}
          <Input
            name="guests"
            type="number"
            min={1}
            max={capacity}
            defaultValue={1}
            required
            className="mt-2"
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        {t("Additional details")}
        <textarea
          name="note"
          maxLength={1000}
          rows={3}
          className="mt-2 w-full rounded-lg border bg-background p-3"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(
            messages[state.error] ??
              t("Unable to send the request. Please try again."),
          )}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t("Sending...") : t("Request a booking")}
      </Button>
    </form>
  );
}
