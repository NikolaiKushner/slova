import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getStudySummary } from "@/lib/study-queue";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getStudySummary(session.user.id, new Date());

  const deckCount = await getPrisma().deck.count({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    dueCount: summary.total,
    dueReviews: summary.dueReviews,
    newToday: Math.min(summary.unseen, summary.allowance),
    unseen: summary.unseen,
    deckCount,
  });
}
