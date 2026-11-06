import { redirect } from "next/navigation";
import { CustomerEmailForm } from "@/components/customer/auth/email-form";
import { currentAccount } from "@/lib/server/auth";

export default async function CustomerEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const { mode, error, next } = await searchParams;
  const returnTo =
    next?.startsWith(`/${locale}/listing/`) ||
    next?.startsWith(`/${locale}/account/`) ||
    next?.startsWith(`/${locale}/messages/`) ||
    next?.startsWith(`/${locale}/partner-bookings`)
      ? next
      : `/${locale}/account/profile`;
  if (process.env.DATABASE_URL && (await currentAccount())) redirect(returnTo);
  const selectedMode = mode === "register" ? "register" : "login";
  return (
    <CustomerEmailForm
      key={selectedMode}
      locale={locale}
      mode={selectedMode}
      enabled={Boolean(process.env.DATABASE_URL)}
      authError={error?.startsWith("google_") ? error : undefined}
      returnTo={returnTo}
    />
  );
}
