import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .slice(0, 200);
  if (q.length < 1) {
    return NextResponse.json({ sets: [], words: [] });
  }

  const [sets, words] = await Promise.all([
    getPrisma().wordSet.findMany({
      where: { userId: session.user.id, title: { contains: q } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, _count: { select: { items: true } } },
    }),
    getPrisma().userWord.findMany({
      where: {
        userId: session.user.id,
        OR: [{ front: { contains: q } }, { back: { contains: q } }],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        front: true,
        back: true,
        // A word belongs to any number of sets; the most recent one is the
        // useful place to land, and a word in none is still findable.
        sets: {
          orderBy: { addedAt: "desc" },
          take: 1,
          select: { setId: true, set: { select: { title: true } } },
        },
      },
    }),
  ]);

  return NextResponse.json({
    sets: sets.map((set) => ({
      id: set.id,
      title: set.title,
      wordCount: set._count.items,
    })),
    words: words.map((word) => ({
      id: word.id,
      front: word.front,
      back: word.back,
      setId: word.sets[0]?.setId ?? null,
      setTitle: word.sets[0]?.set.title ?? null,
    })),
  });
}
