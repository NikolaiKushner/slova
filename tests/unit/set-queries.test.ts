import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  wordSet: { findMany: vi.fn(), findFirst: vi.fn() },
  wordSetItem: { groupBy: vi.fn(), count: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("@/lib/server-metrics", () => ({
  measureServerOperation: (_operation: string, run: () => Promise<unknown>) =>
    run(),
}));

import { getSetCards, getSetDetail } from "@/lib/set-queries";

describe("set queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("combines database aggregates without loading set items", async () => {
    prisma.wordSet.findMany.mockResolvedValue([
      { id: "a", title: "A", _count: { items: 4 } },
      { id: "b", title: "B", _count: { items: 2 } },
    ]);
    prisma.wordSetItem.groupBy
      .mockResolvedValueOnce([{ setId: "a", _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ setId: "b", _count: { _all: 1 } }]);

    await expect(getSetCards("user", new Date(0))).resolves.toEqual([
      { id: "a", title: "A", total: 4, due: 2, unseen: 0 },
      { id: "b", title: "B", total: 2, due: 0, unseen: 1 },
    ]);
    expect(prisma.wordSet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          title: true,
          _count: { select: { items: true } },
        },
      }),
    );
  });

  it("selects only displayed word fields on set detail", async () => {
    prisma.wordSet.findFirst.mockResolvedValue({
      id: "set",
      title: "Set",
      items: [{ word: { id: "word", front: "hello", back: "привет" } }],
    });
    prisma.wordSetItem.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    await expect(
      getSetDetail("user", "set", new Date(0)),
    ).resolves.toEqual({
      id: "set",
      title: "Set",
      words: [{ id: "word", front: "hello", back: "привет" }],
      due: 1,
      unseen: 2,
    });
    expect(prisma.wordSet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
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
    );
  });
});
