import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";

import { loadCourse } from "@/lib/courses/load";
import { saveLessonProgress } from "@/lib/courses/progress";
import {
  GrammarReviewConflictError,
  GrammarReviewNotFoundError,
  loadGrammarReviewQueue,
  loadGrammarReviewSummary,
  persistGrammarReview,
} from "@/lib/courses/review-store";
import { getPrisma } from "@/lib/prisma";
import { getProgress, getStudyActivity } from "@/lib/progress";

const prisma = getPrisma();
const USER_ID = "__grammar_review_user__";
const OTHER_ID = "__grammar_review_other__";
const COURSE_SLUG = "present-simple";
const ZONE = "Europe/Moscow";
const NOW = new Date("2098-04-12T10:00:00.000Z");

const course = loadCourse(COURSE_SLUG);
const RULE_ID = course.rules[0].id;
const [BANK_A, BANK_B] = course.bank.filter((item) => item.ruleId === RULE_ID);

async function resetUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { id: { in: [USER_ID, OTHER_ID] } } });
  await prisma.user.createMany({
    data: [
      { id: USER_ID, email: "grammar-review@slova.test", emailVerified: NOW },
      {
        id: OTHER_ID,
        email: "grammar-review-other@slova.test",
        emailVerified: NOW,
      },
    ],
  });
}

async function weakRule(
  overrides: {
    ruleId?: string;
    courseSlug?: string;
    stage?: number;
    dueAt?: Date | null;
    lastExerciseId?: string | null;
    userId?: string;
  } = {},
) {
  return prisma.grammarRuleMemory.create({
    data: {
      userId: overrides.userId ?? USER_ID,
      courseSlug: overrides.courseSlug ?? COURSE_SLUG,
      ruleId: overrides.ruleId ?? RULE_ID,
      stage: overrides.stage ?? 0,
      dueAt: overrides.dueAt === undefined ? NOW : overrides.dueAt,
      lastMissedAt: NOW,
      lastExerciseId: overrides.lastExerciseId ?? null,
      version: 1,
    },
  });
}

function answer(
  memoryId: string,
  extra: Partial<Parameters<typeof persistGrammarReview>[0]> = {},
) {
  return {
    userId: USER_ID,
    memoryId,
    courseSlug: COURSE_SLUG,
    ruleId: RULE_ID,
    exerciseId: BANK_A.id,
    operationId: randomUUID(),
    correct: true,
    elapsedMs: 1_200,
    now: NOW,
    timeZone: ZONE,
    ...extra,
  };
}

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [USER_ID, OTHER_ID] } } });
});

describe("lesson misses activate rules", () => {
  test("one missed rule becomes one weak rule, due the next local day", async () => {
    await resetUsers();
    await saveLessonProgress({
      userId: USER_ID,
      courseSlug: COURSE_SLUG,
      lessonSlug: course.lessons[0].slug,
      operationId: randomUUID(),
      right: 9,
      missedRuleIds: [RULE_ID],
      now: NOW,
      timeZone: ZONE,
    });

    const rows = await prisma.grammarRuleMemory.findMany({
      where: { userId: USER_ID },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      courseSlug: COURSE_SLUG,
      ruleId: RULE_ID,
      stage: 0,
      lapses: 0,
      reps: 0,
    });
    // 2098-04-13 00:00 in Moscow is 2098-04-12T21:00Z.
    expect(rows[0].dueAt?.toISOString()).toBe("2098-04-12T21:00:00.000Z");
  });

  test("a retried lesson operation does not reset the rule twice", async () => {
    await resetUsers();
    const operationId = randomUUID();
    const input = {
      userId: USER_ID,
      courseSlug: COURSE_SLUG,
      lessonSlug: course.lessons[0].slug,
      operationId,
      right: 9,
      missedRuleIds: [RULE_ID],
      now: NOW,
      timeZone: ZONE,
    };
    await Promise.all([
      saveLessonProgress(input),
      saveLessonProgress(input),
      saveLessonProgress(input),
    ]);

    const rows = await prisma.grammarRuleMemory.findMany({
      where: { userId: USER_ID },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].version).toBe(1);
  });

  test("two lessons missing the same rule keep one row", async () => {
    await resetUsers();
    for (const lesson of course.lessons.slice(0, 2)) {
      await saveLessonProgress({
        userId: USER_ID,
        courseSlug: COURSE_SLUG,
        lessonSlug: lesson.slug,
        operationId: randomUUID(),
        right: 9,
        missedRuleIds: [RULE_ID],
        now: NOW,
        timeZone: ZONE,
      });
    }
    expect(
      await prisma.grammarRuleMemory.count({ where: { userId: USER_ID } }),
    ).toBe(1);
  });

  test("a later miss reopens a cleared rule", async () => {
    await resetUsers();
    const memory = await weakRule({ stage: 3, dueAt: null });
    await prisma.grammarRuleMemory.update({
      where: { id: memory.id },
      data: { clearedAt: NOW },
    });

    await saveLessonProgress({
      userId: USER_ID,
      courseSlug: COURSE_SLUG,
      lessonSlug: course.lessons[0].slug,
      operationId: randomUUID(),
      right: 9,
      missedRuleIds: [RULE_ID],
      now: NOW,
      timeZone: ZONE,
    });

    const row = await prisma.grammarRuleMemory.findUniqueOrThrow({
      where: { id: memory.id },
    });
    expect(row).toMatchObject({ stage: 0, clearedAt: null });
    expect(row.dueAt?.toISOString()).toBe("2098-04-12T21:00:00.000Z");
  });

  test("a rule already due today is not postponed to tomorrow", async () => {
    await resetUsers();
    const dueNow = new Date("2098-04-12T00:00:00.000Z");
    const memory = await weakRule({ dueAt: dueNow });

    await saveLessonProgress({
      userId: USER_ID,
      courseSlug: COURSE_SLUG,
      lessonSlug: course.lessons[0].slug,
      operationId: randomUUID(),
      right: 9,
      missedRuleIds: [RULE_ID],
      now: NOW,
      timeZone: ZONE,
    });

    expect(
      (
        await prisma.grammarRuleMemory.findUniqueOrThrow({
          where: { id: memory.id },
        })
      ).dueAt,
    ).toEqual(dueNow);
  });

  test("a rule id the course does not declare never reaches the table", async () => {
    await resetUsers();
    await saveLessonProgress({
      userId: USER_ID,
      courseSlug: COURSE_SLUG,
      lessonSlug: course.lessons[0].slug,
      operationId: randomUUID(),
      right: 9,
      missedRuleIds: ["not-a-rule", RULE_ID],
      now: NOW,
      timeZone: ZONE,
    });

    const rows = await prisma.grammarRuleMemory.findMany({
      where: { userId: USER_ID },
    });
    expect(rows.map((row) => row.ruleId)).toEqual([RULE_ID]);
  });

  test("a rejected lesson attempt leaves the rule exactly as it was", async () => {
    await resetUsers();
    const operationId = randomUUID();
    const input = {
      userId: USER_ID,
      courseSlug: COURSE_SLUG,
      lessonSlug: course.lessons[0].slug,
      operationId,
      right: 9,
      missedRuleIds: [RULE_ID],
      now: NOW,
      timeZone: ZONE,
    };
    await saveLessonProgress(input);
    const before = await prisma.grammarRuleMemory.findFirstOrThrow({
      where: { userId: USER_ID },
    });

    // The same operation id with a different result is rejected. The rules it
    // would have activated share that transaction, so nothing moves.
    await expect(
      saveLessonProgress({ ...input, right: 1 }),
    ).rejects.toThrow();
    expect(
      await prisma.grammarRuleMemory.findFirstOrThrow({
        where: { userId: USER_ID },
      }),
    ).toMatchObject({ id: before.id, version: before.version, stage: 0 });
  });
});

describe("the due queue", () => {
  test("asks each due rule once, with a bank prompt for that rule", async () => {
    await resetUsers();
    const secondRule = course.rules.find(
      (rule) =>
        rule.id !== RULE_ID &&
        course.bank.some((item) => item.ruleId === rule.id),
    );
    if (!secondRule) throw new Error("fixture needs two banked rules");
    await weakRule();
    await weakRule({ ruleId: secondRule.id });

    const queue = await loadGrammarReviewQueue(USER_ID, NOW, prisma);
    expect(queue.map((item) => item.ruleId).sort()).toEqual(
      [RULE_ID, secondRule.id].sort(),
    );
    const bankIds = new Set(course.bank.map((item) => item.id));
    for (const item of queue) {
      expect(bankIds.has(item.exercise.id)).toBe(true);
      expect(item.exercise.ruleId).toBe(item.ruleId);
    }
  });

  test("leaves a rule that is not due yet out of the sitting", async () => {
    await resetUsers();
    await weakRule({ dueAt: new Date("2098-04-20T00:00:00.000Z") });
    expect(await loadGrammarReviewQueue(USER_ID, NOW, prisma)).toEqual([]);
  });

  test("skips a row whose content has left the repository", async () => {
    await resetUsers();
    await weakRule({ courseSlug: "retired-course" });
    await weakRule({ ruleId: "retired-rule" });
    expect(await loadGrammarReviewQueue(USER_ID, NOW, prisma)).toEqual([]);
  });

  test("avoids the prompt answered last time", async () => {
    await resetUsers();
    await weakRule({ lastExerciseId: BANK_A.id });
    const queue = await loadGrammarReviewQueue(USER_ID, NOW, prisma);
    expect(queue[0].exercise.id).not.toBe(BANK_A.id);
  });

  test("summary counts only live content and finds the next due date", async () => {
    await resetUsers();
    await weakRule();
    await weakRule({ ruleId: "retired-rule" });
    const later = new Date("2098-04-20T00:00:00.000Z");
    const otherRule = course.rules.find(
      (rule) =>
        rule.id !== RULE_ID &&
        course.bank.some((item) => item.ruleId === rule.id),
    );
    if (!otherRule) throw new Error("fixture needs two banked rules");
    await weakRule({ ruleId: otherRule.id, dueAt: later });

    const summary = await loadGrammarReviewSummary(USER_ID, NOW, prisma);
    expect(summary).toMatchObject({
      activeCount: 2,
      dueCount: 1,
      dueCourseTitles: [course.course.title],
    });
    expect(summary.nextDueAt).toEqual(later);
  });

  test("a cleared rule is neither due nor waiting", async () => {
    await resetUsers();
    await weakRule({ stage: 3, dueAt: null });
    expect(await loadGrammarReviewSummary(USER_ID, NOW, prisma)).toMatchObject({
      activeCount: 0,
      dueCount: 0,
      nextDueAt: null,
    });
  });
});

describe("persisting one review answer", () => {
  test("a correct answer advances the stage and logs it", async () => {
    await resetUsers();
    const memory = await weakRule();
    const result = await persistGrammarReview(answer(memory.id), prisma);

    expect(result).toMatchObject({ stage: 1, cleared: false, stale: false });
    expect(result.dueAt?.toISOString()).toBe("2098-04-14T21:00:00.000Z");

    const row = await prisma.grammarRuleMemory.findUniqueOrThrow({
      where: { id: memory.id },
    });
    expect(row).toMatchObject({
      stage: 1,
      reps: 1,
      lapses: 0,
      version: 2,
      lastExerciseId: BANK_A.id,
      lastMissedAt: NOW,
    });
    expect(row.lastReviewedAt).toEqual(NOW);

    const log = await prisma.grammarRuleReviewLog.findFirstOrThrow({
      where: { memoryId: memory.id },
    });
    expect(log).toMatchObject({
      applied: true,
      correct: true,
      previousStage: 0,
      nextStage: 1,
      ruleVersion: 2,
      elapsedMs: 1_200,
    });
  });

  test("a wrong answer resets the stage and counts a lapse", async () => {
    await resetUsers();
    const memory = await weakRule({ stage: 2 });
    const result = await persistGrammarReview(
      answer(memory.id, { correct: false }),
      prisma,
    );

    expect(result.stage).toBe(0);
    expect(result.dueAt?.toISOString()).toBe("2098-04-12T21:00:00.000Z");
    expect(
      await prisma.grammarRuleMemory.findUniqueOrThrow({
        where: { id: memory.id },
      }),
    ).toMatchObject({ stage: 0, lapses: 1, reps: 1, lastMissedAt: NOW });
  });

  test("the third correct answer clears the rule for now", async () => {
    await resetUsers();
    const memory = await weakRule({ stage: 2 });
    const result = await persistGrammarReview(answer(memory.id), prisma);

    expect(result).toMatchObject({ stage: 3, cleared: true, dueAt: null });
    const row = await prisma.grammarRuleMemory.findUniqueOrThrow({
      where: { id: memory.id },
    });
    expect(row.dueAt).toBeNull();
    expect(row.clearedAt).toEqual(NOW);
  });

  test("the same operation and payload returns the first outcome", async () => {
    await resetUsers();
    const memory = await weakRule();
    const input = answer(memory.id);
    const first = await persistGrammarReview(input, prisma);
    const again = await persistGrammarReview(input, prisma);

    expect(again).toMatchObject({
      duplicate: true,
      stage: first.stage,
      cleared: false,
    });
    expect(again.dueAt).toEqual(first.dueAt);
    expect(
      await prisma.grammarRuleReviewLog.count({ where: { memoryId: memory.id } }),
    ).toBe(1);
    expect(
      (
        await prisma.grammarRuleMemory.findUniqueOrThrow({
          where: { id: memory.id },
        })
      ).reps,
    ).toBe(1);
  });

  test("the same operation with a different result is a conflict", async () => {
    await resetUsers();
    const memory = await weakRule();
    const input = answer(memory.id);
    await persistGrammarReview(input, prisma);
    await expect(
      persistGrammarReview({ ...input, correct: false }, prisma),
    ).rejects.toBeInstanceOf(GrammarReviewConflictError);
  });

  test("another learner cannot move this rule", async () => {
    await resetUsers();
    const memory = await weakRule();
    await expect(
      persistGrammarReview(
        answer(memory.id, { userId: OTHER_ID }),
        prisma,
      ),
    ).rejects.toBeInstanceOf(GrammarReviewNotFoundError);
  });

  test("refuses a lesson prompt, another rule's prompt, and missing content", async () => {
    await resetUsers();
    const memory = await weakRule();
    const lessonExercise = course.lessons
      .flatMap((lesson) => lesson.blocks)
      .find(
        (block) => block.type === "exercise" && block.ruleId === RULE_ID,
      );
    if (!lessonExercise || lessonExercise.type !== "exercise") {
      throw new Error("fixture needs a lesson exercise for the rule");
    }
    const otherRuleBank = course.bank.find((item) => item.ruleId !== RULE_ID);
    if (!otherRuleBank) throw new Error("fixture needs a second banked rule");

    for (const extra of [
      { exerciseId: lessonExercise.id },
      { exerciseId: otherRuleBank.id },
      { exerciseId: "removed-in-a-later-release" },
      { courseSlug: "retired-course" },
      { ruleId: "retired-rule" },
    ]) {
      await expect(
        persistGrammarReview(answer(memory.id, extra), prisma),
      ).rejects.toBeInstanceOf(GrammarReviewNotFoundError);
    }
    expect(
      await prisma.grammarRuleReviewLog.count({ where: { memoryId: memory.id } }),
    ).toBe(0);
  });

  test("a rule already moved out of the queue records a stale no-op", async () => {
    await resetUsers();
    const memory = await weakRule({
      stage: 1,
      dueAt: new Date("2098-04-20T00:00:00.000Z"),
    });
    const result = await persistGrammarReview(answer(memory.id), prisma);

    expect(result).toMatchObject({ stale: true, stage: 1, cleared: false });
    expect(
      await prisma.grammarRuleMemory.findUniqueOrThrow({
        where: { id: memory.id },
      }),
    ).toMatchObject({ stage: 1, reps: 0, version: 1 });
    expect(
      await prisma.grammarRuleReviewLog.findFirstOrThrow({
        where: { memoryId: memory.id },
      }),
    ).toMatchObject({ applied: false, ruleVersion: null, nextStage: 1 });
  });

  test("a stale duplicate keeps returning what it first observed", async () => {
    await resetUsers();
    const memory = await weakRule({
      stage: 1,
      dueAt: new Date("2098-04-20T00:00:00.000Z"),
    });
    const input = answer(memory.id);
    const first = await persistGrammarReview(input, prisma);

    await prisma.grammarRuleMemory.update({
      where: { id: memory.id },
      data: { stage: 0, dueAt: NOW },
    });
    const again = await persistGrammarReview(input, prisma);
    expect(again).toMatchObject({
      duplicate: true,
      stale: true,
      stage: first.stage,
    });
    expect(again.dueAt).toEqual(first.dueAt);
  });

  test("two tabs answering the same due rule apply once", async () => {
    await resetUsers();
    const memory = await weakRule();
    const results = await Promise.all([
      persistGrammarReview(answer(memory.id), prisma),
      persistGrammarReview(
        answer(memory.id, { exerciseId: BANK_B.id }),
        prisma,
      ),
    ]);

    expect(results.filter((result) => result.stale)).toHaveLength(1);
    const logs = await prisma.grammarRuleReviewLog.findMany({
      where: { memoryId: memory.id },
    });
    expect(logs.filter((log) => log.applied)).toHaveLength(1);
    expect(logs.filter((log) => !log.applied)).toHaveLength(1);
    expect(
      (
        await prisma.grammarRuleMemory.findUniqueOrThrow({
          where: { id: memory.id },
        })
      ).stage,
    ).toBe(1);
  });

  test("an owned sitting counts the answer; a foreign sitting id is dropped", async () => {
    await resetUsers();
    const sitting = await prisma.studySitting.create({
      data: {
        userId: USER_ID,
        kind: "grammar",
        label: "review",
        sourceState: "all",
        startedAt: NOW,
        lastAt: NOW,
      },
    });
    const foreign = await prisma.studySitting.create({
      data: {
        userId: OTHER_ID,
        kind: "grammar",
        label: "review",
        sourceState: "all",
        startedAt: NOW,
        lastAt: NOW,
      },
    });

    const mine = await weakRule();
    await persistGrammarReview(
      answer(mine.id, { sittingId: sitting.id, correct: false }),
      prisma,
    );
    expect(
      await prisma.studySitting.findUniqueOrThrow({ where: { id: sitting.id } }),
    ).toMatchObject({ reviews: 1, agains: 1, goods: 0 });

    const otherBank = course.bank.find((item) => item.ruleId !== RULE_ID);
    if (!otherBank) throw new Error("fixture needs a second banked rule");
    const second = await weakRule({ ruleId: otherBank.ruleId });
    const dropped = await persistGrammarReview(
      answer(second.id, {
        ruleId: otherBank.ruleId,
        exerciseId: otherBank.id,
        sittingId: foreign.id,
      }),
      prisma,
    );
    expect(dropped.stale).toBe(false);
    expect(
      await prisma.studySitting.findUniqueOrThrow({ where: { id: foreign.id } }),
    ).toMatchObject({ reviews: 0 });
    expect(
      (
        await prisma.grammarRuleReviewLog.findFirstOrThrow({
          where: { memoryId: second.id },
        })
      ).sittingId,
    ).toBeNull();
  });
});

describe("a review-only day is a study day", () => {
  async function completedReviewSitting(endedAt: Date) {
    return prisma.studySitting.create({
      data: {
        userId: USER_ID,
        kind: "grammar",
        label: "review",
        sourceState: "all",
        startedAt: endedAt,
        lastAt: endedAt,
        endedAt,
        endedReason: "completed",
        reviews: 3,
        goods: 2,
        agains: 1,
        score: 67,
      },
    });
  }

  test("the full report counts it and marks the calendar day", async () => {
    await resetUsers();
    await completedReviewSitting(NOW);

    const activity = await getStudyActivity(USER_ID, NOW, ZONE);
    expect(activity.streak).toBe(1);
    expect(activity.dayKeysByKind.grammarReview).toEqual(["2098-04-12"]);
    // The tooltip must be able to tell the two apart.
    expect(activity.dayKeysByKind.lesson).toEqual([]);
    expect(activity.studiedDayKeys).toContain("2098-04-12");
  });

  test("the compact progress line counts it too", async () => {
    await resetUsers();
    await completedReviewSitting(NOW);
    expect(await getProgress(USER_ID, NOW, ZONE)).toMatchObject({
      today: 0,
      streak: 1,
    });
  });

  test("an abandoned sitting is not a study day", async () => {
    await resetUsers();
    await prisma.studySitting.create({
      data: {
        userId: USER_ID,
        kind: "grammar",
        label: "review",
        sourceState: "all",
        startedAt: NOW,
        lastAt: NOW,
        endedAt: NOW,
        endedReason: "abandoned",
      },
    });
    const activity = await getStudyActivity(USER_ID, NOW, ZONE);
    expect(activity.dayKeysByKind.grammarReview).toEqual([]);
    expect(activity.streak).toBe(0);
  });
});
