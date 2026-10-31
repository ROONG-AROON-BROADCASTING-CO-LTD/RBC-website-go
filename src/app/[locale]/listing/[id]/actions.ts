"use server";

import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import {
  BookingError,
  requestPartnerBooking,
} from "@/lib/server/partner-bookings";

export type BookingFormResult = { error: string };

export async function submitBookingRequest(
  _previous: BookingFormResult,
  form: FormData,
): Promise<BookingFormResult> {
  const locale =
    form.get("locale") === "en"
      ? "en"
      : form.get("locale") === "zh"
        ? "zh"
        : "th";
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required" };
  let bookingId: string;
  try {
    bookingId = await requestPartnerBooking(account.id, {
      listingId: String(form.get("listingId") ?? ""),
      startsAt: String(form.get("startsAt") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      note: String(form.get("note") ?? ""),
      guests: String(form.get("guests") ?? ""),
    });
  } catch (error) {
    if (error instanceof BookingError) return { error: error.code };
    throw error;
  }
  redirect(`/${locale}/partner-bookings/${bookingId}`);
}
