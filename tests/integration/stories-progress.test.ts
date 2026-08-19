import { afterEach, describe, expect, test } from "vitest";

import { getPrisma } from "@/lib/prisma";
import {
  completeStory,
  loadCompletedStorySlugs,
  loadStoryProgress,
  saveStoryAnswer,
  StoryProgressError,
} from "@/lib/stories/progress";

const prisma = getPrisma();
const USER_ID = "__stories_progress_user__";
const SLUG = "missing-key";
const QUESTION_IDS = ["q-hurry", "q-key-location", "q-cloze"];
const NOW = new Date("2098-04-12T10:00:00.000Z");

async function resetUser(): Promise<void> {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { id: USER_ID, email: "stories-progress@slova.test", emailVerified: NOW },
  });
}

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
});

describe("saveStoryAnswer", () => {
  test("creates a row keyed by question id", async () => {
    await resetUser();
    const record = await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-hurry",
      answer: "She woke up late.",
      correct: true,
      now: NOW,
    });
    expect(record.answers["q-hurry"]).toMatchObject({
      answer: "She woke up late.",
      correct: true,
    });
    expect(record.completedAt).toBeNull();
  });

  test("a changed answer replaces the previous one for that question", async () => {
    await resetUser();
    await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-hurry",
      answer: "She missed breakfast.",
      correct: false,
      now: NOW,
    });
    const record = await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-hurry",
      answer: "She woke up late.",
      correct: true,
      now: NOW,
    });
    expect(Object.keys(record.answers)).toEqual(["q-hurry"]);
    expect(record.answers["q-hurry"]?.correct).toBe(true);
  });

  test("rejects an answer once the row is completed", async () => {
    await resetUser();
    for (const questionId of QUESTION_IDS) {
      await saveStoryAnswer({
        userId: USER_ID,
        storySlug: SLUG,
        questionId,
        answer: "x",
        correct: true,
        now: NOW,
      });
    }
    await completeStory({ userId: USER_ID, storySlug: SLUG, questionIds: QUESTION_IDS, now: NOW });

    await expect(
      saveStoryAnswer({
        userId: USER_ID,
        storySlug: SLUG,
        questionId: "q-hurry",
        answer: "changed",
        correct: false,
        now: NOW,
      }),
    ).rejects.toThrow(StoryProgressError);
  });
});

describe("completeStory", () => {
  test("rejects completion before every question has an answer", async () => {
    await resetUser();
    await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-hurry",
      answer: "x",
      correct: true,
      now: NOW,
    });
    await expect(
      completeStory({ userId: USER_ID, storySlug: SLUG, questionIds: QUESTION_IDS, now: NOW }),
    ).rejects.toThrow(StoryProgressError);
  });

  test("rejects completion with no answers recorded yet", async () => {
    await resetUser();
    await expect(
      completeStory({ userId: USER_ID, storySlug: SLUG, questionIds: QUESTION_IDS, now: NOW }),
    ).rejects.toThrow(StoryProgressError);
  });

  test("sets completedAt and the correct count once, and is a no-op after", async () => {
    await resetUser();
    await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-hurry",
      answer: "x",
      correct: true,
      now: NOW,
    });
    await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-key-location",
      answer: "x",
      correct: false,
      now: NOW,
    });
    await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-cloze",
      answer: "x",
      correct: true,
      now: NOW,
    });

    const completed = await completeStory({
      userId: USER_ID,
      storySlug: SLUG,
      questionIds: QUESTION_IDS,
      now: NOW,
    });
    expect(completed.correctCount).toBe(2);
    expect(completed.completedAt).toEqual(NOW);

    const later = new Date("2098-04-13T00:00:00.000Z");
    const again = await completeStory({
      userId: USER_ID,
      storySlug: SLUG,
      questionIds: QUESTION_IDS,
      now: later,
    });
    expect(again.completedAt).toEqual(NOW);
    expect(again.correctCount).toBe(2);
  });
});

describe("loadCompletedStorySlugs / loadStoryProgress", () => {
  test("lists only completed slugs", async () => {
    await resetUser();
    await saveStoryAnswer({
      userId: USER_ID,
      storySlug: SLUG,
      questionId: "q-hurry",
      answer: "x",
      correct: true,
      now: NOW,
    });

    expect(await loadCompletedStorySlugs(USER_ID, [SLUG])).toEqual(new Set());

    for (const questionId of QUESTION_IDS.slice(1)) {
      await saveStoryAnswer({
        userId: USER_ID,
        storySlug: SLUG,
        questionId,
        answer: "x",
        correct: true,
        now: NOW,
      });
    }
    await completeStory({ userId: USER_ID, storySlug: SLUG, questionIds: QUESTION_IDS, now: NOW });

    expect(await loadCompletedStorySlugs(USER_ID, [SLUG])).toEqual(new Set([SLUG]));
    expect(await loadStoryProgress(USER_ID, SLUG)).not.toBeNull();
    expect(await loadStoryProgress(USER_ID, "no-such-story")).toBeNull();
  });
});

/**
 * Invariant 2, docs/plans/stories.md §4: reading, glossing, answering and
 * completing a story must never touch UserWord, ReviewLog, stability,
 * difficulty, srsState, intervalDays or dueAt.
 */
describe("the FSRS boundary", () => {
  test("completing a story leaves UserWord and ReviewLog untouched", async () => {
    await resetUser();
    const before = await prisma.userWord.create({
      data: {
        userId: USER_ID,
        key: "key",
        front: "key",
        back: "ключ",
        dueAt: NOW,
        intervalDays: 12.5,
        ease: 2.5,
        introducedAt: NOW,
        stability: 8.3,
        difficulty: 4.1,
        srsState: 2,
        learningSteps: 1,
        reps: 3,
        lapses: 1,
        lastReviewAt: NOW,
        version: 4,
      },
    });

    for (const questionId of QUESTION_IDS) {
      await saveStoryAnswer({
        userId: USER_ID,
        storySlug: SLUG,
        questionId,
        answer: "x",
        correct: true,
        now: NOW,
      });
    }
    await completeStory({ userId: USER_ID, storySlug: SLUG, questionIds: QUESTION_IDS, now: NOW });

    const after = await prisma.userWord.findUniqueOrThrow({ where: { id: before.id } });
    expect(after).toEqual(before);

    const reviewLogs = await prisma.reviewLog.count({ where: { userId: USER_ID } });
    expect(reviewLogs).toBe(0);
  });
});
