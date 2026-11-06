import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/server/staff-auth";
import { staffLoginPath } from "@/lib/staff-navigation";
import { StaffShell } from "@/components/operations/staff-shell";
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
  return (
    <StaffShell locale={locale} role={staff.role} name={staff.display_name}>
      {children}
    </StaffShell>
  );
}
