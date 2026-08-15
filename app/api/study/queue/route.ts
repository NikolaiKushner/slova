import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { buildStudyQueue } from "@/lib/study-queue";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId") ?? undefined;

  const { words, reviewCount } = await buildStudyQueue(session.user.id, {
    setId,
  });

  return NextResponse.json({ words, reviewCount });
}
