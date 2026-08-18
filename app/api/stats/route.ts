import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import { getStudySummary } from "@/lib/study-queue";
import { requestTimeZone } from "@/lib/request-timezone";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const timeZone = await requestTimeZone();
  const summary = await getStudySummary(
    session.user.id,
    new Date(),
    timeZone,
  );

  const setCount = await getPrisma().wordSet.count({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    dueCount: summary.total,
    dueReviews: summary.dueReviews,
    newToday: Math.min(summary.unseen, summary.allowance),
    unseen: summary.unseen,
    setCount,
  });
}
