import { getDb } from "./db";
import { sendTransactionalEmail } from "./email";
import { appOrigin, emailConfigurationIssues } from "@/lib/service-config";

export async function deliverQueuedEmail(limit = 10) {
  const origin = appOrigin();
  if (!origin || emailConfigurationIssues().length)
    throw new Error("email_service_unavailable");
  const sql = getDb();
  const rows = await sql<
    {
      id: string;
      recipient: string;
      subject: string;
      body: string;
      relative_path: string | null;
      attempts: number;
    }[]
  >`
    update rbc_go.email_outbox set locked_until = now() + interval '2 minutes', attempts = attempts + 1
    where id in (
      select id from rbc_go.email_outbox where sent_at is null and available_at <= now()
      and (locked_until is null or locked_until < now()) and attempts < 8
      order by available_at for update skip locked limit ${Math.min(Math.max(limit, 1), 100)}
    ) returning id, recipient, subject, body, relative_path, attempts
  `;
  let sent = 0;
  for (const row of rows) {
    try {
      await sendTransactionalEmail({
        to: row.recipient,
        subject: row.subject,
        text:
          row.body +
          (row.relative_path ? `\n\n${origin}${row.relative_path}` : ""),
        idempotencyKey: `outbox/${row.id}`,
      });
      await sql`update rbc_go.email_outbox set sent_at = now(), locked_until = null where id = ${row.id}`;
      sent++;
    } catch {
      await sql`update rbc_go.email_outbox set locked_until = null,
        available_at = now() + ${Math.min(3600, 30 * 2 ** row.attempts)} * interval '1 second'
        where id = ${row.id}`;
    }
  }
  return { processed: rows.length, sent };
}
