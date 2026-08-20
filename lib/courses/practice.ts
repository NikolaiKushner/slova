/**
 * A lesson stores a pool; the player deals a sitting from it.
 *
 * Practice is ten questions, drawn fresh each visit. The pool is larger, so
 * the first prompt is not a sequence you can learn by heart: items, order
 * and choice options all shuffle. The course test is twelve questions —
 * the whole mix, still in a new order each attempt.
 *
 * `bank.json` is a different pile — later drills, not this sitting — so a
 * prompt from the lesson does not come back the next day as "practice".
 */

import { isExerciseBlock, type Exercise, type Lesson } from "@/content/courses/schema";
import { shuffle, type Rng } from "@/lib/practice/random";

export const LESSON_PRACTICE_SIZE = 10;
export const LESSON_PRACTICE_POOL_MIN = 16;
export const TEST_SITTING_SIZE = 12;

export function isTestLesson(lessonSlug: string): boolean {
  return lessonSlug === "test";
}

export function lessonPool(lesson: Lesson): Exercise[] {
  return lesson.blocks.filter(isExerciseBlock);
}

export function practiceSessionSize(lessonSlug: string, poolLength: number): number {
  const cap = isTestLesson(lessonSlug) ? TEST_SITTING_SIZE : LESSON_PRACTICE_SIZE;
  return Math.min(cap, poolLength);
}

export function dealLessonPractice(
  pool: readonly Exercise[],
  options: { take?: number; rng: Rng },
): Exercise[] {
  const take = Math.min(options.take ?? LESSON_PRACTICE_SIZE, pool.length);
  if (take <= 0) return [];

  const rng = options.rng;
  const queues = queuesByRule(pool, rng);
  const picked: Exercise[] = [];

  while (picked.length < take) {
    let progressed = false;
    for (const queue of queues) {
      if (picked.length >= take) break;
      const next = queue.shift();
      if (!next) continue;
      picked.push(next);
      progressed = true;
    }
    if (!progressed) break;
  }

  return shuffle(picked, rng).map((item) => shuffleOptions(item, rng));
}

function queuesByRule(pool: readonly Exercise[], rng: Rng): Exercise[][] {
  const groups = new Map<string, Exercise[]>();
  for (const item of pool) {
    const list = groups.get(item.ruleId) ?? [];
    list.push(item);
    groups.set(item.ruleId, list);
  }
  return shuffle(
    [...groups.values()].map((items) => shuffle(items, rng)),
    rng,
  );
}

/**
 * Choice order is part of the prompt, not of the item. Grammar Review deals
 * single bank exercises rather than a lesson pool, so it needs this by itself.
 */
export function shuffleOptions(exercise: Exercise, rng: Rng): Exercise {
  if (exercise.kind !== "choice" && exercise.kind !== "pick-sentence") {
    return exercise;
  }
  return { ...exercise, options: shuffle(exercise.options, rng) };
}
