import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";

import { loadCourse } from "@/lib/courses/load";
import { saveLessonProgress } from "@/lib/courses/progress";
import {
  AlreadyScheduledError,
  persistGraduation,
  persistReview,
  undoReview,
} from "@/lib/learning-mutations";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();
const USER_ID = "__learning_integrity_user__";
const COURSE_SLUG = "present-simple";
const NOW = new Date("2098-04-12T10:00:00.000Z");

async function resetUser(): Promise<void> {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: {
      id: USER_ID,
      email: "learning-integrity@slova.test",
      emailVerified: NOW,
    },
  });
}

async function createWord(id: string, introduced = false) {
  return prisma.userWord.create({
    data: {
      id,
      userId: USER_ID,
      key: id,
      front: id,
      back: "fixture",
      dueAt: NOW,
      introducedAt: introduced ? new Date("2098-04-01T00:00:00.000Z") : null,
    },
  });
}

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

describe("review integrity", () => {
  test("parallel retries produce one review and exact undo restores all counters", async () => {
    await resetUser();
    const original = await createWord("__review_retry_word__");
    const sitting = await prisma.studySitting.create({
      data: {
        id: "__review_retry_sitting__",
        userId: USER_ID,
        kind: "study",
        label: "study",
        sourceState: "due",
        startedAt: NOW,
        lastAt: NOW,
      },
    });
    const operationId = randomUUID();
    const input = {
      userId: USER_ID,
      wordId: original.id,
      operationId,
      rating: "good" as const,
      sittingId: sitting.id,
      kind: "study",
      verdict: null,
      elapsedMs: 1_000,
      now: NOW,
    };

    const results = await Promise.all(
      Array.from({ length: 5 }, () => persistReview(input, prisma)),
    );
    expect(results.filter((result) => result.duplicate)).toHaveLength(4);
    expect(
      await prisma.reviewLog.count({ where: { operationId } }),
    ).toBe(1);
    expect(
      await prisma.userWord.findUniqueOrThrow({ where: { id: original.id } }),
    ).toMatchObject({ version: 1, reps: 1 });
    expect(
      await prisma.studySitting.findUniqueOrThrow({ where: { id: sitting.id } }),
    ).toMatchObject({ reviews: 1, goods: 1, agains: 0, introduced: 1 });

    const undone = await undoReview({ userId: USER_ID, operationId }, prisma);
    expect(undone.word).toMatchObject({
      dueAt: original.dueAt,
      intervalDays: original.intervalDays,
      stability: original.stability,
      difficulty: original.difficulty,
      srsState: original.srsState,
      learningSteps: original.learningSteps,
      reps: original.reps,
      lapses: original.lapses,
      lastReviewAt: original.lastReviewAt,
      introducedAt: original.introducedAt,
      version: 2,
    });
    expect(
      await prisma.reviewLog.findUniqueOrThrow({ where: { operationId } }),
    ).toMatchObject({ undoneAt: expect.any(Date) });
    expect(
      await prisma.studySitting.findUniqueOrThrow({ where: { id: sitting.id } }),
    ).toMatchObject({ reviews: 0, goods: 0, agains: 0, introduced: 0 });

    const delayedRetry = await persistReview(input, prisma);
    expect(delayedRetry.duplicate).toBe(true);
    expect(
      await prisma.userWord.findUniqueOrThrow({ where: { id: original.id } }),
    ).toMatchObject({ version: 2, reps: 0 });
  });

  test("distinct concurrent reviews advance from serialized word versions", async () => {
    await resetUser();
    const word = await createWord("__parallel_review_word__", true);
    const operations = Array.from({ length: 5 }, () => randomUUID());

    await Promise.all(
      operations.map((operationId) =>
        persistReview(
          {
            userId: USER_ID,
            wordId: word.id,
            operationId,
            rating: "good",
            kind: "study",
            verdict: null,
            elapsedMs: 500,
            now: NOW,
          },
          prisma,
        ),
      ),
    );

    const persisted = await prisma.userWord.findUniqueOrThrow({
      where: { id: word.id },
    });
    expect(persisted).toMatchObject({ version: 5, reps: 5 });
    const logs = await prisma.reviewLog.findMany({
      where: { wordId: word.id },
      orderBy: { wordVersion: "asc" },
      select: { wordVersion: true },
    });
    expect(logs.map((log) => log.wordVersion)).toEqual([1, 2, 3, 4, 5]);
  });

  test("concurrent graduation creates one logical transition", async () => {
    await resetUser();
    const word = await createWord("__parallel_graduation_word__");
    const operationId = randomUUID();
    const repeated = await Promise.all(
      Array.from({ length: 5 }, () =>
        persistGraduation(
          {
            userId: USER_ID,
            wordId: word.id,
            operationId,
            errors: 2,
            now: NOW,
          },
          prisma,
        ),
      ),
    );
    expect(repeated.filter((result) => result.duplicate)).toHaveLength(4);

    const distinct = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        persistGraduation(
          {
            userId: USER_ID,
            wordId: word.id,
            operationId: randomUUID(),
            errors: 2,
            now: NOW,
          },
          prisma,
        ),
      ),
    );
    expect(distinct.every((result) => result.status === "rejected")).toBe(true);
    for (const result of distinct) {
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(AlreadyScheduledError);
      }
    }
    expect(
      await prisma.reviewLog.count({ where: { wordId: word.id } }),
    ).toBe(1);
    expect(
      await prisma.userWord.findUniqueOrThrow({ where: { id: word.id } }),
    ).toMatchObject({ version: 1, reps: 1 });
  });
});

describe("course progress integrity", () => {
  test("parallel lesson submissions preserve attempts, best score, and rule union", async () => {
    await resetUser();
    const course = loadCourse(COURSE_SLUG);
    const lesson = course.lessons[0];
    const ruleIds = course.rules.slice(0, 2).map((rule) => rule.id);
    const operations = Array.from({ length: 5 }, (_, index) => ({
      operationId: randomUUID(),
      right: index === 4 ? 500 : 0,
      missedRuleIds: [ruleIds[index % ruleIds.length]],
    }));

    await Promise.all(
      operations.map((operation) =>
        saveLessonProgress({
          userId: USER_ID,
          courseSlug: COURSE_SLUG,
          lessonSlug: lesson.slug,
          ...operation,
          now: NOW,
        }),
      ),
    );

    const row = await prisma.userLesson.findUniqueOrThrow({
      where: {
        userId_courseSlug_lessonSlug: {
          userId: USER_ID,
          courseSlug: COURSE_SLUG,
          lessonSlug: lesson.slug,
        },
      },
    });
    expect(row.attempts).toBe(5);
    expect(row.bestScore).toBe(100);
    expect(new Set(row.missedRuleIds)).toEqual(new Set(ruleIds));
    expect(
      await prisma.lessonAttempt.count({
        where: { userId: USER_ID, courseSlug: COURSE_SLUG },
      }),
    ).toBe(5);
  });

  test("a retried lesson result counts once and concurrent final lessons complete the course", async () => {
    await resetUser();
    const course = loadCourse(COURSE_SLUG);
    const [penultimate, last] = course.lessons.slice(-2);
    const operationId = randomUUID();
    await Promise.all(
      Array.from({ length: 4 }, () =>
        saveLessonProgress({
          userId: USER_ID,
          courseSlug: COURSE_SLUG,
          lessonSlug: penultimate.slug,
          operationId,
          right: 500,
          missedRuleIds: [],
          now: NOW,
        }),
      ),
    );
    expect(
      await prisma.userLesson.findUniqueOrThrow({
        where: {
          userId_courseSlug_lessonSlug: {
            userId: USER_ID,
            courseSlug: COURSE_SLUG,
            lessonSlug: penultimate.slug,
          },
        },
      }),
    ).toMatchObject({ attempts: 1, status: "completed" });
    expect(
      await prisma.lessonAttempt.count({ where: { operationId } }),
    ).toBe(1);

    await resetUser();
    await prisma.userCourse.create({
      data: { userId: USER_ID, courseSlug: COURSE_SLUG, startedAt: NOW },
    });
    await prisma.userLesson.createMany({
      data: course.lessons.slice(0, -2).map((lesson) => ({
        userId: USER_ID,
        courseSlug: COURSE_SLUG,
        lessonSlug: lesson.slug,
        status: "completed",
        score: 100,
        bestScore: 100,
        attempts: 1,
        completedAt: NOW,
      })),
    });
    await Promise.all([
      saveLessonProgress({
        userId: USER_ID,
        courseSlug: COURSE_SLUG,
        lessonSlug: last.slug,
        operationId: randomUUID(),
        right: 500,
        missedRuleIds: [],
        now: NOW,
      }),
      saveLessonProgress({
        userId: USER_ID,
        courseSlug: COURSE_SLUG,
        lessonSlug: penultimate.slug,
        operationId: randomUUID(),
        right: 500,
        missedRuleIds: [],
        now: NOW,
      }),
    ]);

    expect(
      await prisma.userLesson.findUniqueOrThrow({
        where: {
          userId_courseSlug_lessonSlug: {
            userId: USER_ID,
            courseSlug: COURSE_SLUG,
            lessonSlug: penultimate.slug,
          },
        },
      }),
    ).toMatchObject({ attempts: 1, status: "completed" });
    expect(
      await prisma.userCourse.findUniqueOrThrow({
        where: {
          userId_courseSlug: { userId: USER_ID, courseSlug: COURSE_SLUG },
        },
      }),
    ).toMatchObject({ completedAt: NOW });
  });
});
