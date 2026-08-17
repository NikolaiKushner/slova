import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  GLOBAL_TTS_USAGE_USER_ID,
  reserveTtsUsage,
} from "@/lib/audio/budget";
import {
  GLOBAL_LLM_USAGE_USER_ID,
  reserveLlmUsage,
} from "@/lib/llm/budget";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();
const LLM_DAY = "2099-01-15";
const TTS_DAY = "2099-01-16";
const users = Array.from(
  { length: 10 },
  (_, index) => `__budget_integration_${index}__`,
);

async function cleanFixtures(): Promise<void> {
  await Promise.all([
    prisma.llmUsage.deleteMany({
      where: {
        day: LLM_DAY,
        userId: { in: [GLOBAL_LLM_USAGE_USER_ID, ...users] },
      },
    }),
    prisma.ttsUsage.deleteMany({
      where: {
        day: TTS_DAY,
        userId: { in: [GLOBAL_TTS_USAGE_USER_ID, ...users] },
      },
    }),
  ]);
}

beforeAll(cleanFixtures);
afterAll(cleanFixtures);

describe("paid-provider budgets", () => {
  test("parallel LLM reservations cannot cross the app-wide token cap", async () => {
    const now = new Date(`${LLM_DAY}T12:00:00.000Z`);
    const results = await Promise.allSettled(
      users.map((userId) =>
        reserveLlmUsage(
          userId,
          { inputTokens: 100, outputTokens: 100 },
          now,
          {
            limits: {
              requests: 10,
              inputTokens: 1_000,
              outputTokens: 1_000,
            },
            globalLimits: {
              requests: 5,
              inputTokens: 500,
              outputTokens: 500,
            },
          },
        ),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      5,
    );
    const global = await prisma.llmUsage.findUniqueOrThrow({
      where: {
        userId_day: { userId: GLOBAL_LLM_USAGE_USER_ID, day: LLM_DAY },
      },
    });
    expect(global).toMatchObject({
      requests: 5,
      inputTokens: 500,
      outputTokens: 500,
    });
    expect(global.capReachedAt).not.toBeNull();
    expect(global.capAttempts).toBe(5);
  });

  test("parallel TTS reservations cannot cross the app-wide character cap", async () => {
    const now = new Date(`${TTS_DAY}T12:00:00.000Z`);
    const results = await Promise.allSettled(
      users.map((userId) =>
        reserveTtsUsage(userId, 100, {
          now,
          limits: { requests: 10, characters: 1_000 },
          globalLimits: { requests: 5, characters: 500 },
        }),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      5,
    );
    const global = await prisma.ttsUsage.findUniqueOrThrow({
      where: {
        userId_day: { userId: GLOBAL_TTS_USAGE_USER_ID, day: TTS_DAY },
      },
    });
    expect(global).toMatchObject({ requests: 5, characters: 500 });
    expect(global.capReachedAt).not.toBeNull();
    expect(global.capAttempts).toBe(5);
  });
});
