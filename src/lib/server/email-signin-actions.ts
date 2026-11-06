"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuthError, createSession, sessionCookieOptions } from "./auth";
import { beginEmailSignIn, verifyEmailSignIn } from "./email-signin";

const cookieName = "rbc_go_email_signin_challenge";
export async function startEmailSignIn(name: string, email: string) {
  try {
    const client =
      (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const challenge = await beginEmailSignIn(name, email, client);
    (await cookies()).set(
      cookieName,
      challenge.token,
      sessionCookieOptions(challenge.expires),
    );
    return { error: "", email: challenge.email };
  } catch (error) {
    return {
      error:
        error instanceof AuthError && error.code === "too_many_attempts"
          ? "Too many attempts. Please try again later."
          : error instanceof AuthError && error.code === "invalid_email"
            ? "Please enter a valid email address."
            : "Email sign-in is temporarily unavailable. Please try again later.",
      email: "",
    };
  }
}
export async function finishEmailSignIn(code: string, locale: string) {
  try {
    const jar = await cookies();
    const accountId = await verifyEmailSignIn(
      jar.get(cookieName)?.value ?? "",
      code,
    );
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
          : error instanceof AuthError && error.code === "use_existing_sign_in"
            ? "Use the sign-in method you originally used for this account."
            : "The verification code is incorrect or unavailable.",
    };
  }
}
