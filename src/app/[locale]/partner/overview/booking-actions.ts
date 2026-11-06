"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { dispatchNotifications } from "@/lib/server/dispatch-notifications";
import {
  BookingError,
  decidePartnerBooking,
} from "@/lib/server/partner-bookings";

export async function respondToBooking(form: FormData) {
  const locale =
    form.get("locale") === "en"
      ? "en"
      : form.get("locale") === "zh"
        ? "zh"
        : "th";
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  try {
    await decidePartnerBooking(
      account.id,
      String(form.get("bookingId") ?? ""),
      form.get("decision") === "decline" ? "decline" : "quote",
      String(form.get("amount") ?? ""),
    );
  } catch (error) {
    if (error instanceof BookingError)
      redirect(`/${locale}/partner/overview?bookingError=${error.code}`);
    throw error;
  }
  revalidatePath(`/${locale}/partner/overview`);
  dispatchNotifications();
  redirect(`/${locale}/partner/overview`);
}
