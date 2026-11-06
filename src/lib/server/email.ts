import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import {
  emailConfigurationIssues,
  emailProvider,
  emailSender,
} from "@/lib/service-config";

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  if (emailConfigurationIssues().length)
    throw new Error("email_service_unavailable");
  if (emailProvider() === "gmail") {
    const user = process.env.GMAIL_USER!;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ""),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      const result = await transporter.sendMail({
        from: emailSender(),
        to: input.to,
        subject: input.subject,
        text: input.text,
        messageId: `<${createHash("sha256").update(input.idempotencyKey).digest("hex")}@${user.split("@")[1]}>`,
      });
      if (!result.accepted?.length || result.rejected?.length)
        throw new Error("email_delivery_failed");
    } catch {
      throw new Error("email_delivery_failed");
    } finally {
      transporter.close();
    }
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: emailSender(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("email_delivery_failed");
}
