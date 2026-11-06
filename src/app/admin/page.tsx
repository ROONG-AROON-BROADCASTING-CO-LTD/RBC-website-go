import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffLoginForm } from "@/components/operations/login-form";
import { currentStaff } from "@/lib/server/staff-auth";
import { staffLocale, staffWorkspacePath } from "@/lib/staff-navigation";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const locale = staffLocale((await searchParams).lang);
  const staff = await currentStaff();
  if (staff) redirect(staffWorkspacePath(staff.role, locale));
  return (
    <StaffLoginForm
      key={locale}
      locale={locale}
      enabled={Boolean(process.env.DATABASE_URL)}
    />
  );
}
