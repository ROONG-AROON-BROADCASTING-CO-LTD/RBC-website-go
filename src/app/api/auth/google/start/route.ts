import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { googleAuthorizationUrl, googleConfig } from "@/lib/server/google";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale =
    requestedLocale === "en" || requestedLocale === "zh"
      ? requestedLocale
      : "th";
  const config = googleConfig();
  if (!config || !process.env.DATABASE_URL) {
    return NextResponse.redirect(
      new URL(`/${locale}/email?error=google_unavailable`, request.url),
    );
  }
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(
    googleAuthorizationUrl(config, state, nonce),
  );
  response.cookies.set("rbc_go_google_state", `${locale}.${state}.${nonce}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 600,
  });
  return response;
}
