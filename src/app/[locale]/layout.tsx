import { notFound } from "next/navigation";
import { RBCProvider } from "@/components/rbc/provider";
import { SiteShell } from "@/components/rbc/shell";
import { CustomerAuthProvider } from "@/components/customer/auth/provider";
import { currentAccount } from "@/lib/server/auth";
import { googleConfig } from "@/lib/server/google";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "th" && locale !== "en" && locale !== "zh") notFound();
  const account = process.env.DATABASE_URL ? await currentAccount() : null;
  return (
    <RBCProvider locale={locale}>
      <CustomerAuthProvider
        initialAccount={account}
        googleEnabled={Boolean(process.env.DATABASE_URL && googleConfig())}
      >
        <SiteShell>{children}</SiteShell>
      </CustomerAuthProvider>
    </RBCProvider>
  );
}
