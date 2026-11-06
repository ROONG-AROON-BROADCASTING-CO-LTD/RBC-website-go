import { redirect } from "next/navigation";
import { PartnerAuthForm } from "@/components/partner/auth-form";
import { currentAccount } from "@/lib/server/auth";
import { cookies } from "next/headers";
import {
  partnerChallengeCookieName,
  partnerEmailConfigured,
  pendingPartnerEmail,
} from "@/lib/server/partner-email";

export default async function PartnerSignup({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (process.env.DATABASE_URL && (await currentAccount()))
    redirect(`/${locale}/apply`);
  const challengeId = (await cookies()).get(partnerChallengeCookieName)?.value;
  const pendingEmail =
    challengeId && process.env.DATABASE_URL
      ? await pendingPartnerEmail(challengeId)
      : null;
  return (
    <PartnerAuthForm
      mode="register"
      locale={locale}
      enabled={partnerEmailConfigured()}
      pendingEmail={pendingEmail}
    />
  );
}
