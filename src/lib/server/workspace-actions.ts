"use server";

import { revalidatePath } from "next/cache";
import { currentAccount } from "./auth";
import { BookingError } from "./partner-bookings";
import {
  approveRefund,
  declineRefund,
  requestBookingRefund,
  registerPayoutRecipient,
  payOutBooking,
  reconcileRefund,
  reconcilePayout,
  requireStaff,
} from "./settlements";
import { applyOmiseWebhookCharge } from "./booking-payments";
import { dispatchNotifications } from "./dispatch-notifications";
import {
  requestPartnerWithdrawal,
  setCommissionPolicy,
} from "./business-finance";
import {
  addAvailabilityBlock,
  removeAvailabilityBlock,
  saveListing,
  sendBookingMessage,
  submitBookingReview,
  progressBooking,
} from "./workspace";

export async function workspaceAction(
  _previous: { error: string; message: string },
  form: FormData,
) {
  const account = await currentAccount();
  if (!account) return { error: "Sign in to continue.", message: "" };
  const value = (name: string) => String(form.get(name) ?? "");
  const locale = ["th", "en", "zh"].includes(value("locale"))
    ? value("locale")
    : "th";
  try {
    switch (value("operation")) {
      case "withdrawal-request":
        await requestPartnerWithdrawal(account.id, value("bookingId"));
        break;
      case "commission-policy":
        await setCommissionPolicy(account.id, value("percent"));
        break;
      case "refund-request":
        await requestBookingRefund(
          account.id,
          value("bookingId"),
          value("kind"),
          value("reason"),
        );
        break;
      case "refund-approve":
        await approveRefund(account.id, value("refundId"), value("amount"));
        break;
      case "refund-decline":
        await declineRefund(account.id, value("refundId"));
        break;
      case "refund-reconcile":
        await reconcileRefund(
          account.id,
          value("refundId"),
          value("providerId"),
        );
        break;
      case "recipient":
        await registerPayoutRecipient(
          account.id,
          value("partnerId"),
          value("recipientId"),
        );
        break;
      case "payout":
        await payOutBooking(account.id, value("bookingId"));
        break;
      case "payout-reconcile":
        await reconcilePayout(
          account.id,
          value("payoutId"),
          value("providerId"),
        );
        break;
      case "charge-reconcile":
        await requireStaff(account.id, true);
        await applyOmiseWebhookCharge(value("providerId"));
        break;
      case "save":
        await saveListing(
          account.id,
          value("listingId"),
          value("saved") === "true",
        );
        break;
      case "message":
        await sendBookingMessage(account.id, value("bookingId"), value("body"));
        break;
      case "review":
        await submitBookingReview(
          account.id,
          value("bookingId"),
          Number(value("rating")),
          value("body"),
        );
        break;
      case "block":
        await addAvailabilityBlock(
          account.id,
          value("listingId"),
          value("startsAt"),
          value("endsAt"),
          value("reason"),
        );
        break;
      case "unblock":
        await removeAvailabilityBlock(account.id, value("blockId"));
        break;
      case "handover":
        await progressBooking(account.id, value("bookingId"), false);
        break;
      case "complete":
        await progressBooking(account.id, value("bookingId"), true);
        break;
      default:
        throw new BookingError("invalid_request");
    }
  } catch (error) {
    if (!(error instanceof BookingError))
      return {
        error:
          "The operation could not be confirmed. Check the status before trying again.",
        message: "",
      };
    const messages: Record<string, string> = {
      dates_unavailable: "These dates are unavailable.",
      invalid_dates: "Check the dates and times (Bangkok time).",
      booking_locked: "This booking cannot be changed in its current state.",
      review_unavailable: "Reviews are available once per completed booking.",
      invalid_review: "Choose a rating from 1 to 5 and write your review.",
      too_many_attempts: "Too many attempts. Please try again later.",
      listing_unavailable: "This vehicle is unavailable.",
      booking_not_found: "Booking not found.",
      invalid_message: "Enter a message of up to 5,000 characters.",
      access_denied: "You do not have permission to perform this action.",
      payment_service_unavailable:
        "Payments are unavailable. Please contact support.",
      settlement_locked:
        "This settlement is locked. Contact support to reconcile it.",
      refund_in_progress: "A refund is already being processed.",
      commission_unconfigured: "The commission policy has not been configured.",
      invalid_commission:
        "Enter a commission from 0 to 100%, with at most two decimal places.",
      withdrawal_unavailable:
        "This balance is not available for withdrawal or has already been requested.",
      deposit_unsettled:
        "Return the security deposit before paying out the booking.",
      recipient_unverified:
        "The payout recipient must be verified and active in Omise.",
      provider_mismatch: "The provider transaction does not match this record.",
    };
    return { error: messages[error.code] ?? "Please try again.", message: "" };
  }
  revalidatePath(`/${locale}`, "layout");
  dispatchNotifications();
  return { error: "", message: "Changes saved." };
}
