import { cleanupExpiredSecurityState } from "@/lib/security-cleanup";
import { reportServerMetric } from "@/lib/server-metrics";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deleted = await cleanupExpiredSecurityState();
  reportServerMetric("security.cleanup", deleted);
  return Response.json({ ok: true, deleted });
}
