import { isAuthorizedJob } from "@/lib/server/jobs";
import { deliverQueuedEmail } from "@/lib/server/email-outbox";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAuthorizedJob(request))
    return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await deliverQueuedEmail());
  } catch {
    return Response.json(
      { error: "email_service_unavailable" },
      { status: 503 },
    );
  }
}
