import { applyOmiseWebhookCharge } from "@/lib/server/booking-payments";
import { verifyOmiseWebhook } from "@/lib/server/omise";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  if (
    !verifyOmiseWebhook(
      body,
      request.headers.get("Omise-Signature"),
      request.headers.get("Omise-Signature-Timestamp"),
      process.env.OMISE_WEBHOOK_SECRET,
    )
  )
    return new Response("Unauthorized", { status: 401 });
  let event: { key?: string; data?: { id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (
    event.key === "charge.complete" &&
    /^chrg_test_[a-z0-9]+$/.test(event.data?.id ?? "")
  ) {
    try {
      await applyOmiseWebhookCharge(event.data!.id!);
    } catch {
      return new Response("Reconciliation failed", { status: 500 });
    }
  }
  return new Response("OK");
}
