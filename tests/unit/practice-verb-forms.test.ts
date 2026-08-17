import { describe, expect, it } from "vitest";

import {
  nextVerbFormsDue,
  pickVerbFormsSitting,
  VERB_FORMS_INTRO_SIZE,
  VERB_FORMS_REVIEW_SIZE,
} from "@/lib/practice/verb-forms";

const now = new Date("2026-08-17T12:00:00.000Z");

function word(
  id: string,
  options: {
    introducedAt?: Date | null;
    dueAt?: Date | null;
    rank?: number;
  } = {},
) {
  return {
    id,
    introducedAt: options.introducedAt === undefined ? null : options.introducedAt,
    dueAt: options.dueAt ?? null,
    rank: options.rank ?? 0,
  };
}

describe("pickVerbFormsSitting", () => {
  it("is empty when none of the 95 are in the dictionary", () => {
    expect(pickVerbFormsSitting([], now)).toEqual({
      words: [],
      sitting: "empty",
    });
  });

  it("takes due verbs and ignores leftover new ones", () => {
    const due = word("go", {
      introducedAt: new Date("2026-01-01"),
      dueAt: new Date("2026-08-16"),
      rank: 90,
    });
    const fresh = word("cut", { rank: 0 });
    const picked = pickVerbFormsSitting([fresh, due], now);
    expect(picked.sitting).toBe("review");
    expect(picked.words).toEqual([due]);
  });

  it("introduces unseen verbs in table order, eight at a time", () => {
    const fresh = Array.from({ length: 12 }, (_, index) =>
      word(String(index), { rank: index }),
    );
    const picked = pickVerbFormsSitting(fresh, now);
    expect(picked.sitting).toBe("intro");
    expect(picked.words).toHaveLength(VERB_FORMS_INTRO_SIZE);
    expect(picked.words.map((item) => item.rank)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("is caught up when everything has been introduced and nothing is due", () => {
    const later = new Date("2026-08-20T12:00:00.000Z");
    expect(
      pickVerbFormsSitting(
        [word("go", { introducedAt: now, dueAt: later, rank: 0 })],
        now,
      ),
    ).toEqual({ words: [], sitting: "caught-up" });
  });

  it("caps a review sitting and asks the earliest due first", () => {
    const due = Array.from({ length: 25 }, (_, index) =>
      word(String(index), {
        introducedAt: now,
        dueAt: new Date(now.getTime() - (25 - index) * 1000),
        rank: index,
      }),
    );
    const picked = pickVerbFormsSitting(due, now);
    expect(picked.sitting).toBe("review");
    expect(picked.words).toHaveLength(VERB_FORMS_REVIEW_SIZE);
    expect(picked.words[0]?.id).toBe("0");
    expect(picked.words.at(-1)?.id).toBe("19");
  });
});

describe("nextVerbFormsDue", () => {
  it("returns the soonest future due", () => {
    const soon = new Date("2026-08-18T12:00:00.000Z");
    const later = new Date("2026-08-21T12:00:00.000Z");
    expect(
      nextVerbFormsDue(
        [
          word("a", { introducedAt: now, dueAt: later }),
          word("b", { introducedAt: now, dueAt: soon }),
        ],
        now,
      ),
    ).toEqual(soon);
  });

  it("skips dues that have already arrived", () => {
    expect(
      nextVerbFormsDue(
        [word("a", { introducedAt: now, dueAt: new Date("2026-08-16") })],
        now,
      ),
    ).toBeNull();
  });
});
