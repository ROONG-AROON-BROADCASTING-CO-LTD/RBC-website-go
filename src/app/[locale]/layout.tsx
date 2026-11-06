import { notFound } from "next/navigation";
import { RBCProvider } from "@/components/rbc/provider";
import { SiteShell } from "@/components/rbc/shell";
import { CustomerAuthProvider } from "@/components/customer/auth/provider";
import { currentAccount } from "@/lib/server/auth";
import { googleConfig } from "@/lib/server/google";
import { emailSignInConfigured } from "@/lib/server/email-signin";
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
    <RBCProvider
      key={account?.id ?? "guest"}
      locale={locale}
      initialTraveler={
        account
          ? {
              name: account.traveler_name ?? account.display_name,
              email: account.traveler_email ?? account.email ?? "",
              phone: account.traveler_phone ?? account.phone_e164 ?? "",
            }
          : undefined
      }
    >
      <CustomerAuthProvider
        initialAccount={account}
        googleEnabled={Boolean(process.env.DATABASE_URL && googleConfig())}
        emailOtpEnabled={emailSignInConfigured()}
      >
        <SiteShell>{children}</SiteShell>
      </CustomerAuthProvider>
    </RBCProvider>
  );
}
