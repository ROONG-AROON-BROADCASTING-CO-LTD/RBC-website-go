import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("bookingId") ?? "";
  const locale =
    url.searchParams.get("locale") === "en"
      ? "en"
      : url.searchParams.get("locale") === "zh"
        ? "zh"
        : "th";
  if (!/^[0-9a-f-]{36}$/i.test(bookingId))
    return NextResponse.redirect(new URL(`/${locale}`, url.origin));
  return NextResponse.redirect(
    new URL(`/${locale}/partner-bookings/${bookingId}`, url.origin),
  );
}
