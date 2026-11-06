"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  AuthError,
  createSessionRecord,
  currentAccount,
  loginPartnerAccount,
  sessionCookieName,
  sessionCookieOptions,
  signOut,
} from "./auth";
import {
  beginPartnerEmailRegistration,
  partnerChallengeCookieName,
  resendPartnerEmailCode,
  verifyPartnerEmailCode,
} from "./partner-email";
import {
  addPartnerDocument,
  PartnerApplicationError,
  savePartnerDraft,
  submitPartnerApplication,
} from "./partner-application";

export type FormResult = {
  error: string;
  step?: "verify";
  email?: string;
  message?: string;
};
function challengeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
}

function localeFrom(form: FormData) {
  return form.get("locale") === "en"
    ? "en"
    : form.get("locale") === "zh"
      ? "zh"
      : "th";
}

export async function registerPartner(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  try {
    const challenge = await beginPartnerEmailRegistration(
      String(form.get("name") ?? ""),
      String(form.get("email") ?? ""),
      String(form.get("password") ?? ""),
    );
    (await cookies()).set(
      partnerChallengeCookieName,
      challenge.id,
      challengeCookieOptions(),
    );
    return { error: "", step: "verify", email: challenge.email };
  } catch (error) {
    if (error instanceof AuthError) return { error: error.code };
    throw error;
  }
}

export async function verifyPartnerRegistration(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const locale = localeFrom(form);
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const cookieStore = await cookies();
  const challengeId = cookieStore.get(partnerChallengeCookieName)?.value ?? "";
  try {
    const accountId = await verifyPartnerEmailCode(
      challengeId,
      String(form.get("code") ?? "").trim(),
    );
    const session = await createSessionRecord(accountId);
    cookieStore.set(
      sessionCookieName,
      session.token,
      sessionCookieOptions(session.expires),
    );
    cookieStore.delete(partnerChallengeCookieName);
  } catch (error) {
    if (error instanceof AuthError)
      return { error: error.code, step: "verify" };
    throw error;
  }
  redirect(`/${locale}/apply`);
}

export async function resendPartnerRegistrationCode(
  _previous: FormResult,
  _form: FormData,
): Promise<FormResult> {
  void _previous;
  void _form;
  const challengeId =
    (await cookies()).get(partnerChallengeCookieName)?.value ?? "";
  try {
    const email = await resendPartnerEmailCode(challengeId);
    (await cookies()).set(
      partnerChallengeCookieName,
      challengeId,
      challengeCookieOptions(),
    );
    return { error: "", step: "verify", email, message: "code_resent" };
  } catch (error) {
    if (error instanceof AuthError)
      return { error: error.code, step: "verify" };
    throw error;
  }
}

export async function changePartnerRegistrationEmail(form: FormData) {
  const locale = localeFrom(form);
  const cookieStore = await cookies();
  cookieStore.delete(partnerChallengeCookieName);
  redirect(`/${locale}/partner-signup`);
}

export async function loginPartner(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const locale = localeFrom(form);
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  try {
    await loginPartnerAccount(
      String(form.get("email") ?? ""),
      String(form.get("password") ?? ""),
    );
  } catch (error) {
    if (error instanceof AuthError) return { error: error.code };
    throw error;
  }
  redirect(`/${locale}/apply`);
}

export async function submitPartner(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const locale = localeFrom(form);
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required" };
  try {
    await savePartnerDraft(account.id, String(form.get("business") ?? ""));
    const files = form
      .getAll("documents")
      .filter((item): item is File => item instanceof File && item.size > 0);
    if (files.length > 5) return { error: "too_many_documents" };
    if (
      files.reduce((total, file) => total + file.size, 0) >
      10 * 1024 * 1024
    ) {
      return { error: "total_file_size" };
    }
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) return { error: "invalid_file_size" };
      await addPartnerDocument(
        account.id,
        file.name,
        file.type,
        new Uint8Array(await file.arrayBuffer()),
      );
    }
    await submitPartnerApplication(account.id);
  } catch (error) {
    if (error instanceof PartnerApplicationError) return { error: error.code };
    throw error;
  }
  redirect(`/${locale}/apply`);
}

export async function logoutPartner(form: FormData) {
  const locale = localeFrom(form);
  await signOut();
  redirect(`/${locale}/partner-login`);
}
