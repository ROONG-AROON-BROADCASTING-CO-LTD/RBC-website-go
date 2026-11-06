import { createHmac, timingSafeEqual } from "node:crypto";
import { appOrigin } from "@/lib/service-config";

export type OmiseCharge = {
  id: string;
  status: "successful" | "pending" | "failed" | "expired" | "reversed";
  livemode: boolean;
  amount: number;
  currency: string;
  ref_id: string | null;
  authorize_uri: string | null;
  failure_message?: string | null;
};

export class OmiseApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly providerMessage?: string,
  ) {
    super(`Omise error: ${code}`);
  }
}

export function omiseMode(): "test" | "live" | null {
  if (process.env.OMISE_MODE === "live") {
    return process.env.ENABLE_LIVE_PAYMENTS === "true" &&
      appOrigin()?.startsWith("https://") &&
      process.env.OMISE_PUBLIC_KEY?.startsWith("pkey_live_") &&
      process.env.OMISE_SECRET_KEY?.startsWith("skey_live_")
      ? "live"
      : null;
  }
  return process.env.OMISE_PUBLIC_KEY?.startsWith("pkey_test_") &&
    process.env.OMISE_SECRET_KEY?.startsWith("skey_test_")
    ? "test"
    : null;
}
export function omiseConfigured() {
  return omiseMode() !== null;
}
export function isOmiseId(
  kind: "chrg" | "tokn" | "rfnd" | "trsf" | "recp",
  id: string,
) {
  const mode = omiseMode();
  return (
    mode !== null &&
    new RegExp(`^${kind}_${mode === "test" ? "test_" : ""}[a-z0-9]+$`).test(id)
  );
}

function secretKey() {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key || !omiseConfigured()) throw new Error("Omise is not configured");
  return key;
}

async function omiseRequest<T extends { id: string }>(
  path: string,
  object: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.omise.co${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`,
      ...(init?.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const value = await response.json();
  if (!response.ok || value.object === "error") {
    throw new OmiseApiError(
      response.status,
      String(value.code ?? "unknown"),
      typeof value.message === "string"
        ? value.message.slice(0, 300)
        : undefined,
    );
  }
  if (value.object !== object || typeof value.id !== "string")
    throw new Error("Invalid Omise response");
  return value as T;
}

export async function createOmiseCharge(input: {
  token: string;
  amountSatang: number;
  attemptId: string;
  bookingId: string;
  returnUri: string;
}) {
  if (
    !isOmiseId("tokn", input.token) ||
    !Number.isSafeInteger(input.amountSatang) ||
    input.amountSatang < 100
  )
    throw new Error("Invalid Omise payment input");
  const body = new URLSearchParams({
    amount: String(input.amountSatang),
    currency: "THB",
    card: input.token,
    ref_id: input.attemptId,
    return_uri: input.returnUri,
    description: `RBC GO booking ${input.bookingId}`,
    "metadata[booking_id]": input.bookingId,
  });
  return omiseRequest<OmiseCharge>("/charges", "charge", {
    method: "POST",
    body,
  });
}

export async function getOmiseCharge(id: string) {
  if (!isOmiseId("chrg", id)) throw new Error("Invalid Omise charge ID");
  return omiseRequest<OmiseCharge>(`/charges/${id}`, "charge");
}

export type OmiseRefund = {
  id: string;
  livemode: boolean;
  amount: number;
  currency: string;
  charge: string;
  status: string;
  metadata: { refund_id?: string };
};
export async function createOmiseRefund(
  chargeId: string,
  amount: number,
  refundId: string,
  reason: string,
) {
  if (!isOmiseId("chrg", chargeId)) throw new Error("Invalid charge");
  return omiseRequest<OmiseRefund>(`/charges/${chargeId}/refunds`, "refund", {
    method: "POST",
    body: new URLSearchParams({
      amount: String(amount),
      reason: reason.slice(0, 255),
      "metadata[refund_id]": refundId,
    }),
  });
}
export async function getOmiseRefund(chargeId: string, refundId: string) {
  if (!isOmiseId("chrg", chargeId) || !isOmiseId("rfnd", refundId))
    throw new Error("Invalid refund");
  return omiseRequest<OmiseRefund>(
    `/charges/${chargeId}/refunds/${refundId}`,
    "refund",
  );
}
export type OmiseRecipient = {
  id: string;
  livemode: boolean;
  verified: boolean;
  active: boolean;
};
export async function getOmiseRecipient(id: string) {
  if (!isOmiseId("recp", id)) throw new Error("Invalid recipient");
  return omiseRequest<OmiseRecipient>(`/recipients/${id}`, "recipient");
}
export type OmiseTransfer = {
  id: string;
  livemode: boolean;
  amount: number;
  currency: string;
  recipient: string;
  paid: boolean;
  total_fee?: number;
  net?: number;
  failure_code: string | null;
  metadata: { payout_id?: string };
};
export async function createOmiseTransfer(
  recipient: string,
  amount: number,
  payoutId: string,
) {
  if (!isOmiseId("recp", recipient)) throw new Error("Invalid recipient");
  return omiseRequest<OmiseTransfer>("/transfers", "transfer", {
    method: "POST",
    body: new URLSearchParams({
      recipient,
      amount: String(amount),
      fail_fast: "true",
      "metadata[payout_id]": payoutId,
    }),
  });
}
export async function getOmiseTransfer(id: string) {
  if (!isOmiseId("trsf", id)) throw new Error("Invalid transfer");
  return omiseRequest<OmiseTransfer>(`/transfers/${id}`, "transfer");
}

export function verifyOmiseWebhook(
  body: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string | undefined,
) {
  if (
    !signatureHeader ||
    !timestampHeader ||
    !secret ||
    !/^\d{10}$/.test(timestampHeader)
  )
    return false;
  if (Math.abs(Date.now() / 1000 - Number(timestampHeader)) > 300) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret, "base64");
  } catch {
    return false;
  }
  if (!key.length) return false;
  const expected = createHmac("sha256", key)
    .update(`${timestampHeader}.${body}`)
    .digest();
  return signatureHeader.split(",").some((value) => {
    const hex = value.trim();
    if (!/^[0-9a-f]{64}$/i.test(hex)) return false;
    return timingSafeEqual(Buffer.from(hex, "hex"), expected);
  });
}
