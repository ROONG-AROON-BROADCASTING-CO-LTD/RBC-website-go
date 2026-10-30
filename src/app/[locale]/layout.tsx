import { notFound } from "next/navigation";
import { RBCProvider } from "@/components/rbc/provider";
import { SiteShell } from "@/components/rbc/shell";
import { CustomerAuthProvider } from "@/components/customer/auth/provider";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "th" && locale !== "en" && locale !== "zh") notFound();
  return (
    <RBCProvider locale={locale}>
      <CustomerAuthProvider>
        <SiteShell>{children}</SiteShell>
      </CustomerAuthProvider>
    </RBCProvider>
  );
}
