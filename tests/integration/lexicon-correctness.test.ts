import { afterEach, describe, expect, test, vi } from "vitest";

import { getPrisma } from "@/lib/prisma";
import { recordTranslations } from "@/lib/lexicon/write";

const prisma = getPrisma();
const KEY_PREFIX = "__lexicon_correctness_";

afterEach(async () => {
  await prisma.lexeme.deleteMany({
    where: { lang: "en", key: { startsWith: KEY_PREFIX } },
  });
});

describe("shared lexicon correctness", () => {
  test("parallel confirmations publish once and refresh the cached count", async () => {
    const text = `${KEY_PREFIX}agreement__`;
    await Promise.all([
      recordTranslations(
        [{ text, translation: "согласие", source: "import" }],
        { userId: "__lexicon_user_one__" },
      ),
      recordTranslations(
        [{ text, translation: "согласие", source: "llm" }],
        { userId: "__lexicon_user_two__" },
      ),
    ]);

    const translation = await prisma.lexemeTranslation.findFirstOrThrow({
      where: { lexeme: { lang: "en", key: text }, targetLang: "ru" },
      include: { confirmationsBy: true },
    });
    expect(translation).toMatchObject({
      confirmations: 2,
      isGlobal: true,
      isPrimary: true,
    });
    expect(translation.confirmationsBy).toHaveLength(2);

    await prisma.lexemeTranslation.update({
      where: { id: translation.id },
      data: { confirmations: 99 },
    });
    await recordTranslations(
      [{ text, translation: "согласие", source: "import" }],
      { userId: "__lexicon_user_one__" },
    );
    expect(
      await prisma.lexemeTranslation.findUniqueOrThrow({
        where: { id: translation.id },
      }),
    ).toMatchObject({ confirmations: 2, isGlobal: true });
  });

  test("a batch creates each pair once and records one confirmation per user", async () => {
    const first = `${KEY_PREFIX}batch_one__`;
    const second = `${KEY_PREFIX}batch_two__`;
    const written = await recordTranslations(
      [
        { text: first, translation: "первый", source: "import" },
        { text: first, translation: "первый", source: "import" },
        { text: second, translation: "второй", source: "import" },
      ],
      { userId: "__lexicon_batch_user__" },
    );

    expect(written).toBe(2);
    expect(
      await prisma.lexeme.count({
        where: { lang: "en", key: { in: [first, second] } },
      }),
    ).toBe(2);
    expect(
      await prisma.lexemeTranslationConfirmation.count({
        where: { translation: { lexeme: { key: { in: [first, second] } } } },
      }),
    ).toBe(2);
  });

  test("concurrent trusted alternatives leave exactly one primary", async () => {
    const text = `${KEY_PREFIX}primary__`;
    const metrics: string[] = [];
    const info = vi.spyOn(console, "info").mockImplementation((value) => {
      metrics.push(String(value));
    });
    try {
      await Promise.all([
        recordTranslations(
          [{ text, translation: "вариант а", source: "curated" }],
          { userId: "__lexicon_curator_one__" },
        ),
        recordTranslations(
          [{ text, translation: "вариант б", source: "curated" }],
          { userId: "__lexicon_curator_two__" },
        ),
      ]);
    } finally {
      info.mockRestore();
    }

    const translations = await prisma.lexemeTranslation.findMany({
      where: { lexeme: { lang: "en", key: text }, targetLang: "ru" },
    });
    expect(translations).toHaveLength(2);
    expect(translations.every((translation) => translation.isGlobal)).toBe(true);
    expect(translations.filter((translation) => translation.isPrimary)).toHaveLength(1);
    expect(
      metrics.map((metric) => JSON.parse(metric)).some(
        (metric) =>
          metric.event === "lexicon.write" && metric.promotionConflicts === 1,
      ),
    ).toBe(true);
  });
});
