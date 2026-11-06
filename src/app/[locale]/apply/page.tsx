import { createTranslator } from "@/lib/i18n";
import { partnerCategoryLabel } from "@/lib/partner-categories";
import { redirect } from "next/navigation";
import { PartnerApplicationForm } from "@/components/partner/application-form";
import { currentAccount } from "@/lib/server/auth";
import { logoutPartner } from "@/lib/server/partner-actions";
import {
  getPartnerApplication,
  getPartnerDocuments,
} from "@/lib/server/partner-application";
import { getActivePartner } from "@/lib/server/listings";
export default async function ApplyPage({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}) {
  const t = createTranslator((await params).locale);
  const { locale } = await params;
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-bold">
          {t("Database is not configured")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("Partner registration is temporarily unavailable.")}
        </p>
      </main>
    );
  }
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const [application, documents] = await Promise.all([
    getPartnerApplication(account.id),
    getPartnerDocuments(account.id),
  ]);
  if (application?.status === "approved") {
    const partner = await getActivePartner(account.id);
    if (partner) redirect(`/${locale}/partner/overview`);
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-bold">
          {t("Partner account is unavailable")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("Contact support to check your partner account status.")}
        </p>
      </main>
    );
  }
  const editable =
    !application ||
    application.status === "draft" ||
    application.status === "changes_requested";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-16">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-primary">
            RBC GO PARTNERS
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {t("Verify your business")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t(
              "Submit business details and documents for review before accessing the partner portal.",
            )}
          </p>
        </div>
        <form action={logoutPartner}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t("Sign out of both areas")}
          </button>
        </form>
      </div>
      <ol className="mb-7 grid gap-3 text-sm sm:grid-cols-3">
        <li className="rounded-2xl border bg-card p-4 font-semibold">
          {t("1. Account created \u2713")}
        </li>
        <li className="rounded-2xl border bg-card p-4 font-semibold">
          {t("2. Submit documents")}
          {editable ? "←" : "✓"}
        </li>
        <li className="rounded-2xl border bg-card p-4 font-semibold">
          {t("3. Await review")}
        </li>
      </ol>
      {editable ? (
        <PartnerApplicationForm
          locale={locale}
          businessName={application?.business_name ?? ""}
          documents={documents}
          rentalCategories={application?.rental_categories ?? []}
        />
      ) : (
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-bold">
            {application.status === "rejected"
              ? t("Application declined")
              : t("Application submitted")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {application.status === "rejected"
              ? t("Contact support for more information.")
              : t("We are reviewing your details and documents.")}
          </p>
          <p className="mt-4 text-sm">
            <strong>{t("Rental categories")}: </strong>
            {application.rental_categories.length
              ? application.rental_categories
                  .map((category) => t(partnerCategoryLabel(category)))
                  .join(" · ")
              : t("Not specified in the original application")}
          </p>
          {application.feedback && (
            <p className="mt-4 rounded-2xl bg-secondary p-4">
              {application.feedback}
            </p>
          )}
        </div>
      )}
      {application?.status === "changes_requested" && application.feedback && (
        <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          {t("Changes requested:")}
          {application.feedback}
        </p>
      )}
    </main>
  );
}
