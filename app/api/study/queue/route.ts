import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { buildStudyQueue } from "@/lib/study-queue";
import { getPrisma } from "@/lib/prisma";
import { parseOptionalSetId } from "@/lib/request-query";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const parsedSetId = parseOptionalSetId(searchParams.get("setId"));
  if (!parsedSetId.ok) return jsonError("invalidSet", 400);
  const setId = parsedSetId.ids[0];
  if (setId) {
    const owned = await getPrisma().wordSet.findFirst({
      where: { id: setId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) return jsonError("notFound", 404);
  }

  const { words, reviewCount } = await buildStudyQueue(session.user.id, {
    setId,
  });

  return NextResponse.json({ words, reviewCount });
}
