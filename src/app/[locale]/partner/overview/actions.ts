"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import {
  createPartnerListing,
  resubmitPartnerListing,
  ListingError,
} from "@/lib/server/listings";

export type ListingFormResult = { error: string };

export async function submitListing(
  _previous: ListingFormResult,
  form: FormData,
): Promise<ListingFormResult> {
  const locale =
    form.get("locale") === "en"
      ? "en"
      : form.get("locale") === "zh"
        ? "zh"
        : "th";
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const account = await currentAccount();
  if (!account) return { error: "sign_in_required" };
  const files = form
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const listingId = String(form.get("listingId") ?? "");
  if (files.length > 5 || (!listingId && files.length < 1))
    return { error: "images_required" };
  if (files.reduce((total, file) => total + file.size, 0) > 10 * 1024 * 1024)
    return { error: "images_too_large" };
  try {
    const input = {
      category: String(form.get("category") ?? ""),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      location: String(form.get("location") ?? ""),
      capacity: String(form.get("capacity") ?? ""),
      price: String(form.get("price") ?? ""),
      deposit: String(form.get("deposit") ?? "0"),
      images: await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      ),
    };
    if (listingId) await resubmitPartnerListing(account.id, listingId, input);
    else await createPartnerListing(account.id, input);
  } catch (error) {
    if (error instanceof ListingError) return { error: error.code };
    throw error;
  }
  revalidatePath(`/${locale}/partner/overview`);
  redirect(`/${locale}/partner/overview`);
}
