import { createHmac, timingSafeEqual } from "node:crypto";

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
  ) {
    super(`Omise error: ${code}`);
  }
}

export function omiseTestConfigured() {
  return Boolean(
    process.env.OMISE_PUBLIC_KEY?.startsWith("pkey_test_") &&
    process.env.OMISE_SECRET_KEY?.startsWith("skey_test_"),
  );
}

function secretKey() {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key?.startsWith("skey_test_"))
    throw new Error("Omise test key is not configured");
  return key;
}

async function omiseRequest(
  path: string,
  init?: RequestInit,
): Promise<OmiseCharge> {
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
    throw new OmiseApiError(response.status, String(value.code ?? "unknown"));
  }
  if (value.object !== "charge" || typeof value.id !== "string")
    throw new Error("Invalid Omise charge response");
  return value as OmiseCharge;
}

export async function createOmiseTestCharge(input: {
  token: string;
  amountSatang: number;
  attemptId: string;
  bookingId: string;
  returnUri: string;
}) {
  if (
    !/^tokn_test_[a-z0-9]+$/.test(input.token) ||
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
  return omiseRequest("/charges", { method: "POST", body });
}

export async function getOmiseTestCharge(id: string) {
  if (!/^chrg_test_[a-z0-9]+$/.test(id))
    throw new Error("Invalid Omise charge ID");
  return omiseRequest(`/charges/${id}`);
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
