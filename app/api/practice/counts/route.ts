import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import {
  SOURCE_STATES,
  setFilter,
  stateFilter,
  type SourceState,
} from "@/lib/practice/source";

/**
 * How many words each choice in the source panel would actually give you.
 *
 * The panel is a promise, and a promise nobody checks is a lie waiting to
 * happen — so the numbers come from the same filters the session runs, not
 * from a parallel guess. State counts honour the chosen sets, because that is
 * the question being asked: "how many due words are in these two lists".
 * Set counts do not honour the chosen state, because a chip's number is what
 * the set holds, and a chip whose count changed as you clicked others would be
 * unreadable.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", 401);

  const userId = session.user.id;
  const setIds = new URL(request.url).searchParams
    .getAll("set")
    .map((id) => id.trim())
    .filter(Boolean);

  const prisma = getPrisma();
  // One instant for every count on the page: read per-query, a word could be
  // due for one number and not for the next.
  const now = new Date();
  const scope = { userId, ...setFilter(setIds) };

  const [stateCounts, sets, unfiled] = await Promise.all([
    Promise.all(
      SOURCE_STATES.map((state) =>
        prisma.userWord.count({
          where: { ...scope, ...stateFilter(state, now) },
        }),
      ),
    ),
    prisma.wordSet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, _count: { select: { items: true } } },
    }),
    prisma.userWord.count({ where: { userId, sets: { none: {} } } }),
  ]);

  const states = Object.fromEntries(
    SOURCE_STATES.map((state, index) => [state, stateCounts[index]]),
  ) as Record<SourceState, number>;

  return NextResponse.json({
    states,
    sets: sets.map((set) => ({
      id: set.id,
      title: set.title,
      count: set._count.items,
    })),
    unfiled,
  });
}
