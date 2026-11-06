import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { bookingAccess, listBookingMessages } from "@/lib/server/workspace";
import { BookingError } from "@/lib/server/partner-bookings";
import { WorkspaceActionForm } from "@/components/customer/workspace-action-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/domain";

export default async function BookingMessagesPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const account = await currentAccount();
  if (!account)
    redirect(
      `/${locale}/email?next=${encodeURIComponent(`/${locale}/messages/${id}`)}`,
    );
  const t = (text: string) => translate(locale, text);
  let booking, messages;
  try {
    [booking, messages] = await Promise.all([
      bookingAccess(account.id, id),
      listBookingMessages(account.id, id),
    ]);
  } catch (error) {
    if (error instanceof BookingError) notFound();
    throw error;
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-10">
      <Button variant="ghost" asChild className="self-start">
        <Link href={`/${locale}/account/messages`}>{t("Messages")}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{booking.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!messages.length && (
            <p className="text-sm text-muted-foreground">
              {t("No records yet")}
            </p>
          )}
          {messages.toReversed().map((message) => (
            <article key={message.id} className="rounded-xl border p-4">
              <p className="text-sm font-semibold">{message.display_name}</p>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {message.body}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {message.created_at.toLocaleString(locale, {
                  timeZone: "Asia/Bangkok",
                })}
              </p>
            </article>
          ))}
          <WorkspaceActionForm
            operation="message"
            values={{ bookingId: id }}
            label="Send message"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="message">{t("Message")}</FieldLabel>
                <Textarea id="message" name="body" maxLength={5000} required />
              </Field>
            </FieldGroup>
          </WorkspaceActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
