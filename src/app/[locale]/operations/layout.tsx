import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { currentStaff } from "@/lib/server/staff-auth";
import { logoutStaff } from "@/lib/server/staff-actions";
import { staffLoginPath } from "@/lib/staff-navigation";
import { createTranslator } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Staff workspace",
  robots: { index: false, follow: false },
};

export default async function OperationsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const staff = await currentStaff();
  if (!staff) redirect(staffLoginPath(locale));
  const t = createTranslator(locale);
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <Link
            href={staffLoginPath(locale)}
            className="font-bold tracking-widest text-primary"
          >
            RBC GO TEAM
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="max-w-60 truncate text-sm text-muted-foreground">
              {staff.display_name}
            </span>
            <form action={logoutStaff}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline">
                {t("Sign out")}
              </Button>
            </form>
          </div>
        </div>
        <nav
          aria-label={t("Staff navigation")}
          className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-4"
        >
          {[
            ...(staff.role !== "support"
              ? [
                  { path: "partners", label: "Partner applications" },
                  { path: "listings", label: "Vehicle listings" },
                ]
              : []),
            { path: "payments", label: "Payments and settlements" },
          ].map(({ path, label }) => (
            <Button key={path} variant="ghost" asChild>
              <Link href={`/${locale}/operations/${path}`}>{t(label)}</Link>
            </Button>
          ))}
          <Button variant="ghost" asChild>
            <Link href={`/${locale}`}>{t("Back to website")}</Link>
          </Button>
        </nav>
      </header>
      <div id="main">{children}</div>
    </>
  );
}
