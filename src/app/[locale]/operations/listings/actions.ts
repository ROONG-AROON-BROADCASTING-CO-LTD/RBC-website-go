"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/server/staff-auth";
import { staffLoginPath } from "@/lib/staff-navigation";
import { reviewListing } from "@/lib/server/listings";

export async function reviewSubmittedListing(form: FormData) {
  const locale =
    form.get("locale") === "en"
      ? "en"
      : form.get("locale") === "zh"
        ? "zh"
        : "th";
  const account = await currentStaff();
  if (!account) redirect(staffLoginPath(locale));
  const decision = String(form.get("decision") ?? "");
  const listingId = String(form.get("listingId") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(listingId) ||
    !["approved", "changes_requested"].includes(decision)
  ) {
    redirect(`/${locale}/operations/listings?error=invalid_request`);
  }
  try {
    await reviewListing(
      account.id,
      listingId,
      decision as "approved" | "changes_requested",
      String(form.get("feedback") ?? ""),
    );
  } catch {
    redirect(`/${locale}/operations/listings?error=review_failed`);
  }
  revalidatePath(`/${locale}/operations/listings`);
  redirect(`/${locale}/operations/listings`);
}
