import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  userWord: { count: vi.fn() },
  wordSet: { count: vi.fn() },
  llmUsage: { aggregate: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));

import { kindOf } from "@/lib/lexicon/dataset";
import { getOverview } from "@/lib/overview";
import { LEARNED_INTERVAL_DAYS } from "@/lib/word-rating";

type Word = { front: string; introducedAt: Date | null; intervalDays: number };

const word = (front: string, intervalDays = 0): Word => ({
  front,
  introducedAt: intervalDays === 0 ? null : new Date(),
  intervalDays,
});

const rows: Word[] = [
  word("apple"),
  word("bread", 3),
  word("weather", LEARNED_INTERVAL_DAYS),
  word("give up"),
  word("look after", 5),
  word("run out of", LEARNED_INTERVAL_DAYS + 10),
];

type Where = Record<string, unknown>;

function matches(row: Word, where: Where): boolean {
  return Object.entries(where).every(([field, condition]) => {
    if (field === "userId") return true;
    const value = row[field as keyof Word];
    if (condition === null) return value === null;
    if (condition && typeof condition === "object") {
      const test = condition as Where;
      if ("contains" in test)
        return String(value).includes(String(test.contains));
      if ("gte" in test) return Number(value) >= Number(test.gte);
    }
    return value === condition;
  });
}

beforeEach(() => {
  prisma.userWord.count.mockImplementation(({ where }: { where: Where }) =>
    Promise.resolve(rows.filter((row) => matches(row, where)).length),
  );
  prisma.wordSet.count.mockResolvedValue(2);
  prisma.llmUsage.aggregate.mockResolvedValue({
    _sum: { lexiconHits: 3, llmMisses: 1 },
  });
});

describe("getOverview", () => {
  it("counts words and phrases apart, and both as entries", async () => {
    const overview = await getOverview("u1");

    expect(overview.entries).toBe(6);
    expect(overview.words).toBe(3);
    expect(overview.phrases).toBe(3);
    expect(overview.words + overview.phrases).toBe(overview.entries);
  });

  it("classifies exactly as kindOf does", async () => {
    const phrases = rows.filter(
      (row) => kindOf(row.front) === "phrase",
    ).length;

    expect((await getOverview("u1")).phrases).toBe(phrases);
  });

  it("keeps a phrase pack out of the word count", async () => {
    const before = await getOverview("u1");
    rows.push(word("put off"), word("take after", 4));
    const after = await getOverview("u1");
    rows.length = before.entries;

    expect(after.words).toBe(before.words);
    expect(after.phrases).toBe(before.phrases + 2);
  });

  it("bands every entry, phrases included", async () => {
    const overview = await getOverview("u1");

    expect(overview.fresh).toBe(2);
    expect(overview.learned).toBe(2);
    expect(overview.learning).toBe(2);
    expect(overview.fresh + overview.learning + overview.learned).toBe(
      overview.entries,
    );
  });

  it("reports the lexicon hit rate as a share of what was asked", async () => {
    expect((await getOverview("u1")).hitRate).toBe(0.75);
  });

  it("has no hit rate before anything was translated", async () => {
    prisma.llmUsage.aggregate.mockResolvedValue({
      _sum: { lexiconHits: null, llmMisses: null },
    });

    expect((await getOverview("u1")).hitRate).toBeNull();
  });
});
