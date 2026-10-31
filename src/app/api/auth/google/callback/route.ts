import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createSessionRecord,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/server/auth";
import {
  accountForGoogle,
  googleConfig,
  googleProfileFromCode,
  verifiedGoogleState,
} from "@/lib/server/google";

export const runtime = "nodejs";

function finish(request: NextRequest, locale: string, success: boolean) {
  const path = success
    ? `/${locale}/account/profile`
    : `/${locale}/email?error=google_failed`;
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set("rbc_go_google_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const saved = request.cookies.get("rbc_go_google_state")?.value ?? "";
  const received = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const verified = verifiedGoogleState(saved, received);
  const locale = verified?.locale ?? "th";
  if (
    !verified ||
    !code ||
    code.length > 2048 ||
    request.nextUrl.searchParams.has("error")
  )
    return finish(request, locale, false);
  const config = googleConfig();
  if (!config || !process.env.DATABASE_URL)
    return finish(request, locale, false);
  try {
    const profile = await googleProfileFromCode(config, code, verified.nonce);
    const accountId = await accountForGoogle(profile);
    const { token, expires } = await createSessionRecord(accountId);
    const response = finish(request, locale, true);
    response.cookies.set(
      sessionCookieName,
      token,
      sessionCookieOptions(expires),
    );
    return response;
  } catch {
    return finish(request, locale, false);
  }
}
