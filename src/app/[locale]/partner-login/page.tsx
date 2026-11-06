import { redirect } from "next/navigation";
import { PartnerAuthForm } from "@/components/partner/auth-form";
import { currentAccount } from "@/lib/server/auth";

export default async function PartnerLogin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (process.env.DATABASE_URL && (await currentAccount()))
    redirect(`/${locale}/apply`);
  return (
    <PartnerAuthForm
      mode="login"
      locale={locale}
      enabled={Boolean(process.env.DATABASE_URL)}
    />
  );
}
