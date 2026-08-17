import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeGlobalLimits,
  activeLimits,
  BudgetExceededError,
  checkBudget,
  conservativeInputTokenReservation,
  DEFAULT_GLOBAL_LIMITS,
  DEFAULT_LIMITS,
  GLOBAL_LLM_USAGE_USER_ID,
  reconcileLlmUsage,
  reserveLlmUsage,
  secondsUntilReset,
  utcDay,
} from "@/lib/llm/budget";

const LIMITS = { requests: 50, inputTokens: 100_000, outputTokens: 60_000 };
const NOON = new Date("2026-08-11T12:00:00.000Z");

function used(counts: Partial<typeof LIMITS> = {}) {
  return { requests: 0, inputTokens: 0, outputTokens: 0, ...counts };
}

afterEach(() => {
  delete process.env.LLM_DAILY_REQUESTS;
  delete process.env.LLM_DAILY_INPUT_TOKENS;
  delete process.env.LLM_DAILY_OUTPUT_TOKENS;
  delete process.env.LLM_GLOBAL_DAILY_REQUESTS;
  delete process.env.LLM_GLOBAL_DAILY_INPUT_TOKENS;
  delete process.env.LLM_GLOBAL_DAILY_OUTPUT_TOKENS;
});

describe("checkBudget", () => {
  it("lets through a user one request short of the limit", () => {
    const verdict = checkBudget(used({ requests: 49 }), LIMITS, NOON);
    expect(verdict.withinBudget).toBe(true);
  });

  it("stops a user who has spent exactly the limit", () => {
    // The count is of requests already made, so reaching the limit means the
    // next one would be over it.
    const verdict = checkBudget(used({ requests: 50 }), LIMITS, NOON);
    expect(verdict).toMatchObject({ withinBudget: false, reason: "requests" });
  });

  it("stops a user past the limit, however they got there", () => {
    const verdict = checkBudget(used({ requests: 51 }), LIMITS, NOON);
    expect(verdict.withinBudget).toBe(false);
  });

  it("stops on output tokens even when the request count is fine", () => {
    const verdict = checkBudget(
      used({ requests: 3, outputTokens: 60_000 }),
      LIMITS,
      NOON,
    );
    expect(verdict).toMatchObject({
      withinBudget: false,
      reason: "outputTokens",
    });
  });

  it("stops on input tokens too", () => {
    const verdict = checkBudget(
      used({ inputTokens: 100_000 }),
      LIMITS,
      NOON,
    );
    expect(verdict).toMatchObject({ withinBudget: false, reason: "inputTokens" });
  });

  it("says something a person can act on, not a counter name", () => {
    const verdict = checkBudget(used({ requests: 50 }), LIMITS, NOON);
    if (verdict.withinBudget) throw new Error("expected the budget to be spent");
    expect(verdict.message).toContain("resets at midnight UTC");
    expect(verdict.retryAfter).toBeGreaterThan(0);
  });
});

describe("conservativeInputTokenReservation", () => {
  it("adds margin when the provider count is the larger estimate", () => {
    expect(conservativeInputTokenReservation({ short: true }, 2_000)).toBe(
      2_256,
    );
  });

  it("uses serialized UTF-8 bytes for a larger multilingual request", () => {
    const request = { text: "я".repeat(1_000) };
    const bytes = new TextEncoder().encode(JSON.stringify(request)).byteLength;
    expect(conservativeInputTokenReservation(request, 1)).toBe(bytes + 1_024);
  });
});

describe("utcDay", () => {
  it("is the calendar day in UTC, whatever the local zone", () => {
    expect(utcDay(new Date("2026-08-11T00:00:00.000Z"))).toBe("2026-08-11");
    expect(utcDay(new Date("2026-08-11T23:59:59.999Z"))).toBe("2026-08-11");
  });

  it("rolls over at midnight UTC, not at midnight anywhere else", () => {
    const lastMoment = new Date("2026-08-11T23:59:59.999Z");
    const firstMoment = new Date("2026-08-12T00:00:00.000Z");
    expect(utcDay(lastMoment)).toBe("2026-08-11");
    expect(utcDay(firstMoment)).toBe("2026-08-12");
    expect(utcDay(lastMoment)).not.toBe(utcDay(firstMoment));
  });

  it("gives a spent-out user a new allowance one millisecond later", () => {
    const spent = used({ requests: 50 });
    const before = new Date("2026-08-11T23:59:59.999Z");
    const after = new Date("2026-08-12T00:00:00.000Z");

    expect(checkBudget(spent, LIMITS, before).withinBudget).toBe(false);
    // The row is keyed by day, so a new day reads an empty count.
    expect(utcDay(after)).not.toBe(utcDay(before));
    expect(checkBudget(used(), LIMITS, after).withinBudget).toBe(true);
  });
});

describe("secondsUntilReset", () => {
  it("counts to the next midnight UTC", () => {
    expect(secondsUntilReset(new Date("2026-08-11T23:59:59.000Z"))).toBe(1);
    expect(secondsUntilReset(new Date("2026-08-11T12:00:00.000Z"))).toBe(
      12 * 60 * 60,
    );
  });

  it("never returns zero, so Retry-After is always a wait", () => {
    expect(
      secondsUntilReset(new Date("2026-08-11T23:59:59.999Z")),
    ).toBeGreaterThan(0);
  });

  it("crosses a month boundary without going negative", () => {
    expect(secondsUntilReset(new Date("2026-08-31T23:00:00.000Z"))).toBe(3600);
  });
});

describe("activeLimits", () => {
  it("falls back to the measured defaults", () => {
    expect(activeLimits()).toEqual(DEFAULT_LIMITS);
  });

  it("takes an override from the environment", () => {
    process.env.LLM_DAILY_REQUESTS = "5";
    expect(activeLimits().requests).toBe(5);
  });

  it("ignores nonsense rather than turning the limit off", () => {
    process.env.LLM_DAILY_REQUESTS = "unlimited";
    expect(activeLimits().requests).toBe(DEFAULT_LIMITS.requests);
    process.env.LLM_DAILY_REQUESTS = "0";
    expect(activeLimits().requests).toBe(DEFAULT_LIMITS.requests);
    process.env.LLM_DAILY_REQUESTS = "-1";
    expect(activeLimits().requests).toBe(DEFAULT_LIMITS.requests);
  });
});

describe("activeGlobalLimits", () => {
  it("falls back to one personal allowance for the whole app", () => {
    expect(activeGlobalLimits()).toEqual(DEFAULT_LIMITS);
    expect(activeGlobalLimits()).toEqual(DEFAULT_GLOBAL_LIMITS);
  });

  it("takes an override from the environment", () => {
    process.env.LLM_GLOBAL_DAILY_REQUESTS = "7";
    expect(activeGlobalLimits().requests).toBe(7);
  });

  it("allows environment overrides to lower but not raise hard maxima", () => {
    process.env.LLM_GLOBAL_DAILY_REQUESTS = "500";
    process.env.LLM_GLOBAL_DAILY_INPUT_TOKENS = "1000000";
    process.env.LLM_GLOBAL_DAILY_OUTPUT_TOKENS = "600000";
    expect(activeGlobalLimits()).toEqual(DEFAULT_GLOBAL_LIMITS);
  });
});

describe("LLM reservation", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  const empty = { requests: 0, inputTokens: 0, outputTokens: 0 };

  function usageMock(
    updateCounts: number[],
    current = empty,
  ) {
    const updateMany = vi.fn();
    for (const count of updateCounts) {
      updateMany.mockResolvedValueOnce({ count });
    }
    return {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(current),
      updateMany,
    };
  }

  it("reserves the app-wide slot before the person's", async () => {
    const usage = usageMock([1, 1]);

    await reserveLlmUsage(
      "user-1",
      { inputTokens: 120, outputTokens: 400 },
      now,
      {
        limits: { requests: 5, inputTokens: 1000, outputTokens: 1000 },
        globalLimits: {
          requests: 50,
          inputTokens: 10_000,
          outputTokens: 10_000,
        },
        dependencies: {
          usage,
          transaction: (operation) => operation(usage),
        },
      },
    );

    expect(usage.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: GLOBAL_LLM_USAGE_USER_ID,
        day: "2026-08-16",
        requests: { lt: 50 },
        inputTokens: { lte: 9_880 },
        outputTokens: { lte: 9_600 },
      },
      data: {
        requests: { increment: 1 },
        inputTokens: { increment: 120 },
        outputTokens: { increment: 400 },
      },
    });
    expect(usage.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-1",
        day: "2026-08-16",
        requests: { lt: 5 },
        inputTokens: { lte: 880 },
        outputTokens: { lte: 600 },
      },
      data: {
        requests: { increment: 1 },
        inputTokens: { increment: 120 },
        outputTokens: { increment: 400 },
      },
    });
  });

  it("stops extra accounts when the shared pot is empty", async () => {
    const usage = usageMock(
      [0, 1],
      { requests: 50, inputTokens: 0, outputTokens: 0 },
    );

    await expect(
      reserveLlmUsage(
        "user-1",
        { inputTokens: 120, outputTokens: 400 },
        now,
        {
          limits: { requests: 5, inputTokens: 1000, outputTokens: 1000 },
          globalLimits: {
            requests: 50,
            inputTokens: 10_000,
            outputTokens: 10_000,
          },
          dependencies: { usage },
        },
      ),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(usage.createMany).toHaveBeenLastCalledWith({
      data: [
        { userId: GLOBAL_LLM_USAGE_USER_ID, day: "2026-08-16" },
      ],
      skipDuplicates: true,
    });
    expect(usage.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: GLOBAL_LLM_USAGE_USER_ID,
        day: "2026-08-16",
      },
      data: {
        capReachedAt: now,
        capReason: "requests",
        capAttempts: { increment: 1 },
      },
    });
  });

  it("reconciles unused tokens on both reserved rows", async () => {
    const usage = usageMock([1, 1]);

    await reconcileLlmUsage(
      "user-1",
      { inputTokens: 120, outputTokens: 400 },
      { inputTokens: 100, outputTokens: 250 },
      now,
      {
        usage,
        transaction: (operation) => operation(usage),
      },
    );

    expect(usage.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: GLOBAL_LLM_USAGE_USER_ID,
        day: "2026-08-16",
        inputTokens: { gte: 20 },
        outputTokens: { gte: 150 },
      },
      data: {
        inputTokens: { decrement: 20 },
        outputTokens: { decrement: 150 },
      },
    });
    expect(usage.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-1",
        day: "2026-08-16",
        inputTokens: { gte: 20 },
        outputTokens: { gte: 150 },
      },
      data: {
        inputTokens: { decrement: 20 },
        outputTokens: { decrement: 150 },
      },
    });
  });
});
