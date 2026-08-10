import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildStudyQueue } from "@/lib/study-queue";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deckId") ?? undefined;

  const { cards, reviewCount } = await buildStudyQueue(session.user.id, {
    deckId,
  });

  return NextResponse.json({ cards, reviewCount });
}
