import type { Metadata } from "next";
import { AccountAccessForm } from "@/components/customer/account-access-form";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default async function AccountAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ mode?: string; token?: string }>;
}) {
  const { locale } = await params,
    { mode, token } = await searchParams;
  const selected =
    mode === "verify" || mode === "reset" ? mode : "request-reset";
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">
        {translate(
          locale,
          selected === "verify" ? "Verify email" : "Reset password",
        )}
      </h1>
      <AccountAccessForm mode={selected} token={token} />
    </div>
  );
}
