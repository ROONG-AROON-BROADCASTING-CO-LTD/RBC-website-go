"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { normalizeCustomerPhone } from "@/lib/customer-auth";
import { AuthError, createSession, sessionCookieOptions } from "./auth";
import { beginPhoneChallenge, verifyPhoneChallenge } from "./phone-auth";
const cookieName = "rbc_go_phone_challenge";
export async function startPhoneSignIn(
  name: string,
  country: string,
  phone: string,
) {
  const normalized = normalizeCustomerPhone(country, phone);
  if (!normalized)
    return {
      error: "Please enter a valid mobile number.",
      phone: "",
      expiresAt: 0,
    };
  try {
    const client =
      (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const challenge = await beginPhoneChallenge(name, normalized, client);
    (await cookies()).set(
      cookieName,
      challenge.token,
      sessionCookieOptions(challenge.expires),
    );
    return {
      error: "",
      phone: challenge.phone,
      expiresAt: challenge.expires.getTime(),
    };
  } catch (error) {
    return {
      error:
        error instanceof AuthError && error.code === "too_many_attempts"
          ? "Too many attempts. Please try again later."
          : "Phone sign-in is temporarily unavailable.",
      phone: "",
      expiresAt: 0,
    };
  }
}
export async function finishPhoneSignIn(code: string, locale: string) {
  try {
    const jar = await cookies(),
      token = jar.get(cookieName)?.value ?? "";
    const accountId = await verifyPhoneChallenge(token, code);
    await createSession(accountId);
    jar.delete(cookieName);
    revalidatePath(
      `/${["th", "en", "zh"].includes(locale) ? locale : "th"}`,
      "layout",
    );
    return { error: "" };
  } catch (error) {
    return {
      error:
        error instanceof AuthError && error.code === "code_expired"
          ? "The code has expired. Request a new code."
          : "The verification code is incorrect or unavailable.",
    };
  }
}
