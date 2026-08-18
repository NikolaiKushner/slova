import { expect, test } from "vitest";

import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  seedTestUserFixture,
  TEST_FIXTURE_SOURCE,
} from "@/scripts/test-user-fixture";
import { resolveTestUserEnvironment } from "@/scripts/test-user-env";

test("the E2E fixture is deterministic and idempotent", async () => {
  const environment = resolveTestUserEnvironment(process.env);
  const prisma = getPrisma();

  const first = await seedTestUserFixture(prisma, environment);
  const second = await seedTestUserFixture(prisma, environment);
  expect(second.userId).toBe(first.userId);

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: environment.email },
    include: {
      sets: { include: { items: true }, orderBy: { title: "asc" } },
      words: { orderBy: { front: "asc" } },
      courses: { include: { lessons: { orderBy: { lessonSlug: "asc" } } } },
    },
  });

  expect(user.emailVerified).not.toBeNull();
  expect(user.passwordHash).not.toBeNull();
  expect(
    await verifyPassword(environment.password, user.passwordHash ?? ""),
  ).toBe(true);
  expect(user.sets).toHaveLength(2);
  expect(user.sets.map((set) => [set.title, set.items.length])).toEqual([
    ["E2E Core words", 4],
    ["E2E Empty set", 0],
  ]);
  expect(user.words).toHaveLength(4);
  expect(user.words.every((word) => word.source === TEST_FIXTURE_SOURCE)).toBe(
    true,
  );
  expect(user.words.filter((word) => word.introducedAt === null)).toHaveLength(
    2,
  );
  expect(
    user.words.find((word) => word.front === "fixture due")?.dueAt,
  ).toEqual(new Date("2025-01-10T00:00:00.000Z"));
  expect(
    user.words.find((word) => word.front === "fixture partial"),
  ).toMatchObject({ reps: 5, lapses: 1, intervalDays: 30 });
  expect(user.courses).toHaveLength(1);
  expect(user.courses[0].lessons.map((lesson) => lesson.status)).toEqual([
    "completed",
    "in_progress",
  ]);
});
