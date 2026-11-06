import Link from "next/link";
import { createTranslator } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    t = createTranslator(locale);
  const sections = [
    [
      "booking",
      "Booking help",
      "Choose a published vehicle, request your dates, and wait for the partner to confirm a final quote. Pay only after reviewing that quote.",
    ],
    [
      "cancellations",
      "Cancellation and refunds",
      "You can cancel an unpaid request before payment starts. For a paid booking, submit a cancellation and refund request from the booking page. The team reviews the amount before any refund is sent.",
    ],
    [
      "deposits",
      "Security deposits",
      "The final quote includes the security deposit shown on your booking. After the service is completed, request its return from the booking page.",
    ],
    [
      "privacy",
      "Data and privacy",
      "Account details, bookings and messages are stored on the server and protected by account permissions. Card details are handled directly by Omise and are not stored by RBC GO.",
    ],
    [
      "support",
      "Booking support",
      "Open a booking from My Bookings to message your partner and support team. Messages remain available after you sign in on another device.",
    ],
  ];
  const support = process.env.SUPPORT_EMAIL;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">{t("Help")}</h1>
      {sections.map(([id, title, body]) => (
        <Card key={id} id={id}>
          <CardHeader>
            <CardTitle>{t(title)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{t(body)}</p>
          </CardContent>
        </Card>
      ))}
      <Button asChild className="self-start">
        <Link href={`/${locale}/account/bookings`}>{t("My Bookings")}</Link>
      </Button>
      {support && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support) && (
        <a className="text-primary underline" href={`mailto:${support}`}>
          {support}
        </a>
      )}
    </div>
  );
}
