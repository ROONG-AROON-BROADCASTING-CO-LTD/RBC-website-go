"use server";

import { redirect } from "next/navigation";
import {
  AuthError,
  currentAccount,
  loginEmailAccount,
  registerEmailAccount,
  signOut,
} from "./auth";
import type { Traveler } from "@/lib/domain";
import {
  CustomerProfileError,
  saveCustomerProfileRecord,
} from "./customer-profile";

export type CustomerEmailResult = { error: string };

export async function submitCustomerEmail(
  _previous: CustomerEmailResult,
  form: FormData,
): Promise<CustomerEmailResult> {
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const locale =
    form.get("locale") === "en"
      ? "en"
      : form.get("locale") === "zh"
        ? "zh"
        : "th";
  const mode = form.get("mode");
  try {
    if (mode === "register") {
      await registerEmailAccount(
        String(form.get("name") ?? ""),
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
      );
    } else if (mode === "login") {
      await loginEmailAccount(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
      );
    } else {
      return { error: "invalid_request" };
    }
  } catch (error) {
    if (error instanceof AuthError) return { error: error.code };
    throw error;
  }
  const next = String(form.get("next") ?? "");
  redirect(
    next.startsWith(`/${locale}/listing/`) ||
      next.startsWith(`/${locale}/partner-bookings`)
      ? next
      : `/${locale}/account/profile`,
  );
}

export async function logoutCustomer() {
  await signOut();
}

export async function saveCustomerProfile(
  traveler: Traveler,
): Promise<{ error?: string }> {
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required" };
  try {
    await saveCustomerProfileRecord(account.id, traveler);
  } catch (error) {
    if (error instanceof CustomerProfileError)
      return { error: "invalid_profile" };
    throw error;
  }
  return {};
}
