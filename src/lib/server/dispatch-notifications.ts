import { after } from "next/server";
import { emailConfigurationIssues } from "@/lib/service-config";
import { deliverQueuedEmail } from "./email-outbox";
export function dispatchNotifications() {
  if (emailConfigurationIssues().length) return;
  after(async () => {
    try {
      await deliverQueuedEmail(10);
    } catch {
      console.warn("Email delivery deferred to the notification worker.");
    }
  });
}
