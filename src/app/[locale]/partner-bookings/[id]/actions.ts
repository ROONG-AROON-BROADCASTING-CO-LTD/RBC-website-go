"use server";

import { currentAccount } from "@/lib/server/auth";
import {
  BookingError,
  cancelPartnerBooking,
} from "@/lib/server/partner-bookings";
import { payPartnerBooking } from "@/lib/server/booking-payments";

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
    return { error: "" };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.code };
    throw error;
  }
}
