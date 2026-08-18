import { getPrisma } from "@/lib/prisma";
import { measureServerOperation } from "@/lib/server-metrics";

type CountRow = { setId: string; _count: { _all: number } };

function countsBySet(rows: CountRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.setId, row._count._all]));
}

/** Set cards with database-side counts instead of hydrated word rows. */
export async function getSetCards(userId: string, now: Date) {
  const prisma = getPrisma();
  const [sets, dueRows, unseenRows] = await measureServerOperation(
    "sets.list",
    () =>
      Promise.all([
        prisma.wordSet.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            _count: { select: { items: true } },
          },
        }),
        prisma.wordSetItem.groupBy({
          by: ["setId"],
          where: {
            set: { userId },
            word: { introducedAt: { not: null }, dueAt: { lte: now } },
          },
          _count: { _all: true },
        }),
        prisma.wordSetItem.groupBy({
          by: ["setId"],
          where: { set: { userId }, word: { introducedAt: null } },
          _count: { _all: true },
        }),
      ]),
  );

  const dueBySet = countsBySet(dueRows);
  const unseenBySet = countsBySet(unseenRows);
  return sets.map((set) => ({
    id: set.id,
    title: set.title,
    total: set._count.items,
    due: dueBySet.get(set.id) ?? 0,
    unseen: unseenBySet.get(set.id) ?? 0,
  }));
}

/** Set detail with only UI fields plus database-side study counts. */
export async function getSetDetail(userId: string, setId: string, now: Date) {
  const prisma = getPrisma();
  const scope = { setId, set: { userId } };
  const [set, due, unseen] = await measureServerOperation(
    "sets.detail",
    () =>
      Promise.all([
        prisma.wordSet.findFirst({
          where: { id: setId, userId },
          select: {
            id: true,
            title: true,
            items: {
              orderBy: { addedAt: "asc" },
              select: {
                word: { select: { id: true, front: true, back: true } },
              },
            },
          },
        }),
        prisma.wordSetItem.count({
          where: {
            ...scope,
            word: { introducedAt: { not: null }, dueAt: { lte: now } },
          },
        }),
        prisma.wordSetItem.count({
          where: { ...scope, word: { introducedAt: null } },
        }),
      ]),
  );

  if (!set) return null;
  return {
    id: set.id,
    title: set.title,
    words: set.items.map((item) => item.word),
    due,
    unseen,
  };
}
