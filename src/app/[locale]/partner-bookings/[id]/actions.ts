"use server";

import { currentAccount } from "@/lib/server/auth";
import {
  BookingError,
  cancelPartnerBooking,
} from "@/lib/server/partner-bookings";
import { payPartnerBooking } from "@/lib/server/booking-payments";
import { refreshBookingPayment } from "@/lib/server/booking-payments";
import { revalidatePath } from "next/cache";
import { dispatchNotifications } from "@/lib/server/dispatch-notifications";

export async function checkBookingPayment(bookingId: string, locale: string) {
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required" };
  try {
    await refreshBookingPayment(account.id, bookingId);
    dispatchNotifications();
  } catch {
    return { error: "payment_pending" };
  }
  const language = ["th", "en", "zh"].includes(locale) ? locale : "th";
  revalidatePath(`/${language}/partner-bookings/${bookingId}`);
  return { error: "" };
}

export async function payBookingWithOmise(bookingId: string, token: string) {
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required", authorizeUri: null };
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (
    !baseUrl ||
    (!/^https:\/\//.test(baseUrl) &&
      !/^http:\/\/localhost(?::\d+)?$/.test(baseUrl))
  )
    return { error: "service_unavailable", authorizeUri: null };
  try {
    const authorizeUri = await payPartnerBooking(
      account.id,
      bookingId,
      token,
      baseUrl,
    );
    dispatchNotifications();
    return { error: "", authorizeUri };
  } catch (error) {
    if (error instanceof BookingError)
      return { error: error.code, authorizeUri: null };
    return { error: "payment_failed", authorizeUri: null };
  }
}

export async function cancelBookingRequest(bookingId: string) {
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required" };
  try {
    await cancelPartnerBooking(account.id, bookingId);
    dispatchNotifications();
    return { error: "" };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.code };
    throw error;
  }
}
