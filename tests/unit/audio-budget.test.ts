import { describe, expect, it, vi } from "vitest";

import {
  activeGlobalTtsLimits,
  checkTtsLimits,
  GLOBAL_TTS_USAGE_USER_ID,
  reserveTtsUsage,
  ttsSecondsUntilReset,
  ttsUtcDay,
  TtsBudgetExceededError,
} from "@/lib/audio/budget";

describe("TTS budget", () => {
  const now = new Date("2026-08-16T23:59:30.250Z");

  it("uses UTC days and checks the next request and its characters", () => {
    expect(ttsUtcDay(now)).toBe("2026-08-16");
    expect(ttsSecondsUntilReset(now)).toBe(30);
    expect(
      checkTtsLimits(
        { requests: 19, characters: 1_800 },
        200,
        { requests: 20, characters: 2_000 },
        now,
      ),
    ).toEqual({ withinBudget: true });
    expect(
      checkTtsLimits(
        { requests: 20, characters: 1_800 },
        1,
        { requests: 20, characters: 2_000 },
        now,
      ),
    ).toMatchObject({ withinBudget: false, reason: "requests" });
    expect(
      checkTtsLimits(
        { requests: 1, characters: 1_900 },
        101,
        { requests: 20, characters: 2_000 },
        now,
      ),
    ).toMatchObject({ withinBudget: false, reason: "characters" });
  });

  it("reserves requests and characters in one conditional update", async () => {
    const usage = {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 }),
    };

    await reserveTtsUsage("user-1", 120, {
      now,
      limits: { requests: 5, characters: 500 },
      globalLimits: { requests: 50, characters: 5_000 },
      dependencies: {
        usage,
        transaction: (operation) => operation(usage),
      },
    });

    expect(usage.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: GLOBAL_TTS_USAGE_USER_ID,
        day: "2026-08-16",
        requests: { lt: 50 },
        characters: { lte: 4_880 },
      },
      data: {
        requests: { increment: 1 },
        characters: { increment: 120 },
      },
    });
    expect(usage.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-1",
        day: "2026-08-16",
        requests: { lt: 5 },
        characters: { lte: 380 },
      },
      data: {
        requests: { increment: 1 },
        characters: { increment: 120 },
      },
    });
  });

  it("rejects when the atomic reservation changes no row", async () => {
    const usage = {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ requests: 50, characters: 0 }),
      updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
    };

    await expect(
      reserveTtsUsage("user-1", 120, {
        now,
        limits: { requests: 5, characters: 500 },
        globalLimits: { requests: 50, characters: 5_000 },
        dependencies: { usage },
      }),
    ).rejects.toBeInstanceOf(TtsBudgetExceededError);
    expect(usage.updateMany).toHaveBeenCalledTimes(1);
    expect(usage.upsert).toHaveBeenLastCalledWith({
      where: {
        userId_day: {
          userId: GLOBAL_TTS_USAGE_USER_ID,
          day: "2026-08-16",
        },
      },
      create: expect.objectContaining({ capReason: "requests", capAttempts: 1 }),
      update: expect.objectContaining({ capReason: "requests" }),
    });
  });

  it("uses conservative configurable global defaults", () => {
    expect(activeGlobalTtsLimits({})).toEqual({
      requests: 100,
      characters: 10_000,
    });
    expect(
      activeGlobalTtsLimits({
        TTS_GLOBAL_DAILY_REQUESTS: "7",
        TTS_GLOBAL_DAILY_CHARACTERS: "700",
      }),
    ).toEqual({ requests: 7, characters: 700 });
  });

  it("does not let environment overrides raise hard global maxima", () => {
    expect(
      activeGlobalTtsLimits({
        TTS_GLOBAL_DAILY_REQUESTS: "1000",
        TTS_GLOBAL_DAILY_CHARACTERS: "1000000",
      }),
    ).toEqual({ requests: 100, characters: 10_000 });
  });
});
