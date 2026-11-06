import { isAuthorizedJob } from "@/lib/server/jobs";
import { reconcilePayments } from "@/lib/server/reconcile-payments";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAuthorizedJob(request))
    return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await reconcilePayments());
  } catch {
    return Response.json(
      { error: "payment_service_unavailable" },
      { status: 503 },
    );
  }
}
