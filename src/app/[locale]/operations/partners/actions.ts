"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/server/staff-auth";
import { staffLoginPath } from "@/lib/staff-navigation";
import { reviewPartnerApplication } from "@/lib/server/partner-application";

export async function reviewApplication(form: FormData) {
  const locale =
    form.get("locale") === "en"
      ? "en"
      : form.get("locale") === "zh"
        ? "zh"
        : "th";
  const account = await currentStaff();
  if (!account) redirect(staffLoginPath(locale));
  const decision = String(form.get("decision") ?? "");
  const applicationId = String(form.get("applicationId") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(applicationId) ||
    !["approved", "changes_requested", "rejected"].includes(decision)
  ) {
    redirect(`/${locale}/operations/partners?error=invalid_request`);
  }
  try {
    await reviewPartnerApplication(
      account.id,
      applicationId,
      decision as "approved" | "changes_requested" | "rejected",
      String(form.get("feedback") ?? ""),
    );
  } catch {
    redirect(`/${locale}/operations/partners?error=review_failed`);
  }
  revalidatePath(`/${locale}/operations/partners`);
  redirect(`/${locale}/operations/partners`);
}
