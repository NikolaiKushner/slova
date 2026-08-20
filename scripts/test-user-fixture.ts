import type { PrismaClient } from "@/app/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import type { TestUserEnvironment } from "@/scripts/test-user-env";

export const TEST_FIXTURE_SOURCE = "e2e-fixture";

const IDS = {
  emptySet: "e2e-set-empty",
  populatedSet: "e2e-set-populated",
  dueWord: "e2e-word-due",
  newWord: "e2e-word-new",
  partialWord: "e2e-word-partial",
  extraNewWord: "e2e-word-new-extra",
  course: "e2e-course-present-simple",
  completedLesson: "e2e-lesson-forms",
  currentLesson: "e2e-lesson-use",
  weakHabits: "e2e-rule-ps-use-habits",
  weakThirdPerson: "e2e-rule-ps-third-person-s",
  weakSameForm: "e2e-rule-iv-same",
  weakNoEd: "e2e-rule-iv-no-ed",
} as const;

const VERIFIED_AT = new Date("2025-01-01T00:00:00.000Z");
const INTRODUCED_AT = new Date("2025-01-02T00:00:00.000Z");
const LAST_REVIEW_AT = new Date("2025-01-03T00:00:00.000Z");
const DUE_AT = new Date("2025-01-10T00:00:00.000Z");
const FUTURE_DUE_AT = new Date("2099-01-01T00:00:00.000Z");

export type TestUserFixtureSummary = {
  userId: string;
  email: string;
  sets: number;
  words: number;
  lessons: number;
  weakRules: number;
};

export async function seedTestUserFixture(
  prisma: PrismaClient,
  config: Pick<TestUserEnvironment, "email" | "password">,
): Promise<TestUserFixtureSummary> {
  const passwordHash = await hashPassword(config.password);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: config.email },
      select: { id: true },
    });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: "E2E Learner",
            image: null,
            emailVerified: VERIFIED_AT,
            passwordHash,
            dailyNewLimit: 20,
            sessionVersion: { increment: 1 },
          },
        })
      : await tx.user.create({
          data: {
            email: config.email,
            name: "E2E Learner",
            emailVerified: VERIFIED_AT,
            passwordHash,
            dailyNewLimit: 20,
          },
        });

    await tx.verificationToken.deleteMany({
      where: {
        identifier: {
          in: [`verify:${config.email}`, `reset:${config.email}`],
        },
      },
    });
    await tx.rateLimit.deleteMany({
      where: {
        key: {
          in: [
            `login:${config.email}`,
            `reset:email:${config.email}`,
            `words:${user.id}`,
            `translate:${user.id}`,
            `audio:${user.id}`,
          ],
        },
      },
    });
    await tx.lexemeTranslationConfirmation.deleteMany({
      where: { userId: user.id },
    });
    await tx.llmUsage.deleteMany({ where: { userId: user.id } });
    await tx.ttsUsage.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.reviewLog.deleteMany({ where: { userId: user.id } });
    await tx.studySitting.deleteMany({ where: { userId: user.id } });
    await tx.wordSet.deleteMany({ where: { userId: user.id } });
    await tx.userWord.deleteMany({ where: { userId: user.id } });
    await tx.userCourse.deleteMany({ where: { userId: user.id } });
    // Cascades the review log. Without it a reset would leave weak rules from
    // the previous run due, and the review card would count them.
    await tx.grammarRuleMemory.deleteMany({ where: { userId: user.id } });

    await tx.wordSet.createMany({
      data: [
        {
          id: IDS.emptySet,
          userId: user.id,
          title: "E2E Empty set",
          createdAt: VERIFIED_AT,
          updatedAt: VERIFIED_AT,
        },
        {
          id: IDS.populatedSet,
          userId: user.id,
          title: "E2E Core words",
          createdAt: VERIFIED_AT,
          updatedAt: VERIFIED_AT,
        },
      ],
    });

    await tx.userWord.createMany({
      data: [
        {
          id: IDS.dueWord,
          userId: user.id,
          key: "fixture due",
          front: "fixture due",
          back: "пора повторить",
          source: TEST_FIXTURE_SOURCE,
          dueAt: DUE_AT,
          intervalDays: 7,
          introducedAt: INTRODUCED_AT,
          stability: 4,
          difficulty: 6,
          srsState: 2,
          reps: 2,
          lastReviewAt: LAST_REVIEW_AT,
          createdAt: VERIFIED_AT,
          updatedAt: VERIFIED_AT,
        },
        {
          id: IDS.newWord,
          userId: user.id,
          key: "fixture new",
          front: "fixture new",
          back: "новое слово",
          source: TEST_FIXTURE_SOURCE,
          dueAt: DUE_AT,
          createdAt: new Date("2025-01-01T01:00:00.000Z"),
          updatedAt: VERIFIED_AT,
        },
        {
          id: IDS.partialWord,
          userId: user.id,
          key: "fixture partial",
          front: "fixture partial",
          back: "частично изучено",
          source: TEST_FIXTURE_SOURCE,
          dueAt: FUTURE_DUE_AT,
          intervalDays: 30,
          introducedAt: INTRODUCED_AT,
          stability: 18,
          difficulty: 5,
          srsState: 2,
          learningSteps: 0,
          reps: 5,
          lapses: 1,
          lastReviewAt: LAST_REVIEW_AT,
          createdAt: new Date("2025-01-01T02:00:00.000Z"),
          updatedAt: VERIFIED_AT,
        },
        {
          id: IDS.extraNewWord,
          userId: user.id,
          key: "fixture fresh",
          front: "fixture fresh",
          back: "ещё новое слово",
          source: TEST_FIXTURE_SOURCE,
          dueAt: DUE_AT,
          createdAt: new Date("2025-01-01T03:00:00.000Z"),
          updatedAt: VERIFIED_AT,
        },
      ],
    });

    await tx.wordSetItem.createMany({
      data: [
        IDS.dueWord,
        IDS.newWord,
        IDS.partialWord,
        IDS.extraNewWord,
      ].map((wordId) => ({ wordId, setId: IDS.populatedSet })),
    });

    await tx.userCourse.create({
      data: {
        id: IDS.course,
        userId: user.id,
        courseSlug: "present-simple",
        startedAt: INTRODUCED_AT,
        lastLessonSlug: "use",
      },
    });
    await tx.userLesson.createMany({
      data: [
        {
          id: IDS.completedLesson,
          userId: user.id,
          courseSlug: "present-simple",
          lessonSlug: "forms",
          status: "completed",
          score: 90,
          bestScore: 90,
          attempts: 1,
          completedAt: LAST_REVIEW_AT,
        },
        {
          id: IDS.currentLesson,
          userId: user.id,
          courseSlug: "present-simple",
          lessonSlug: "use",
          status: "in_progress",
          score: 50,
          bestScore: 50,
          attempts: 1,
          missedRuleIds: ["ps-use-habits"],
        },
      ],
    });

    /*
     * Weak grammar rules, due in the past so Grammar Review has something to
     * ask. Two courses, so the catalog card has a plural to render, and one
     * of them is the rule the in-progress lesson above already records as
     * missed — the fixture reads as one learner's history, not two.
     */
    await tx.grammarRuleMemory.createMany({
      data: [
        { id: IDS.weakHabits, courseSlug: "present-simple", ruleId: "ps-use-habits", stage: 0 },
        { id: IDS.weakThirdPerson, courseSlug: "present-simple", ruleId: "ps-third-person-s", stage: 1 },
        { id: IDS.weakSameForm, courseSlug: "irregular-verbs", ruleId: "iv-same", stage: 0 },
        { id: IDS.weakNoEd, courseSlug: "irregular-verbs", ruleId: "iv-no-ed", stage: 2 },
      ].map((rule) => ({
        ...rule,
        userId: user.id,
        dueAt: DUE_AT,
        lastMissedAt: LAST_REVIEW_AT,
        createdAt: VERIFIED_AT,
        updatedAt: VERIFIED_AT,
      })),
    });

    return {
      userId: user.id,
      email: user.email,
      sets: 2,
      words: 4,
      lessons: 2,
      weakRules: 4,
    };
  }, { maxWait: 10_000, timeout: 30_000 });
}
