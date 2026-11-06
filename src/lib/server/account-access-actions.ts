"use server";
import { revalidatePath } from "next/cache";
import { dispatchNotifications } from "./dispatch-notifications";
import { currentAccount, AuthError } from "./auth";
import {
  requestAccountLink,
  requestPasswordReset,
  consumeAccountLink,
} from "./account-recovery";

export async function accountAccessAction(
  _previous: { error: string; message: string },
  form: FormData,
) {
  const locale = ["th", "en", "zh"].includes(String(form.get("locale")))
    ? String(form.get("locale"))
    : "th";
  const mode = String(form.get("mode"));
  try {
    if (mode === "request-reset")
      await requestPasswordReset(String(form.get("email") ?? ""), locale);
    else if (mode === "request-verify") {
      const account = await currentAccount();
      if (!account) throw new AuthError("sign_in_required");
      await requestAccountLink(account.id, "verify", locale);
    } else if (mode === "verify" || mode === "reset")
      await consumeAccountLink(
        String(form.get("token") ?? ""),
        mode,
        String(form.get("password") ?? ""),
      );
    else throw new AuthError("invalid_request");
  } catch (error) {
    const messages: Record<string, string> = {
      email_service_unavailable:
        "Email delivery is not configured. Please contact support.",
      invalid_password: "Use a password of at least 12 characters.",
      invalid_email: "Enter a valid email address.",
      code_expired: "This link has expired or was already used.",
      too_many_attempts: "Too many attempts. Please try again later.",
      sign_in_required: "Sign in to continue.",
    };
    return {
      error:
        error instanceof AuthError
          ? (messages[error.code] ?? "Please try again.")
          : "Please try again.",
      message: "",
    };
  }
  revalidatePath(`/${locale}`, "layout");
  dispatchNotifications();
  return {
    error: "",
    message:
      mode === "request-reset"
        ? "If this email has an account, a reset link will be sent."
        : mode === "request-verify"
          ? "Check your email for a verification link."
          : mode === "verify"
            ? "Your email is verified."
            : "Your password has been reset. Sign in with your new password.",
  };
}
