import { z } from "zod";

/**
 * The shape of a grammar course on disk.
 *
 * Content lives in JSON next to this file; progress lives in Postgres. The
 * split is the same one the lexicon already uses: what everybody shares is
 * reviewed in a PR, and a person's place in a course is not.
 *
 * A lesson is an ordered list of blocks: a lead, headed sections (examples,
 * form tables, tagged rules, a recap), a pitfall, then a pool of exercises.
 * Exercises are a pool: the player deals ten each visit, shuffled. The
 * course test deals twelve. An exercise always names a `ruleId`, so a miss can later
 * schedule the rule rather than the prompt. Extra exercises for the same rule
 * sit in `bank.json` and must not reuse an id from a lesson — otherwise
 * Practice / Grammar would drill the answer the person just saw.
 */

export const EXERCISE_KINDS = [
  "choice",
  "gap",
  "transform",
  "pick-sentence",
] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

const nonEmpty = z.string().trim().min(1);

export const ruleSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  /** Shown after a miss, instead of a bare "wrong". Markdown, one or two lines. */
  anchorMd: nonEmpty,
});

export const rulesFileSchema = z.array(ruleSchema).min(1);

export const courseSchema = z.object({
  slug: nonEmpty,
  title: nonEmpty,
  titleRu: nonEmpty,
  level: z.enum(["A1", "A2", "B1"]),
  order: z.number().int().positive(),
  estMinutes: z.number().int().positive(),
  lessons: z.array(nonEmpty).min(1),
  /** What the person will be able to do after the course. Markdown, same as lessons. */
  outcomes: z.array(nonEmpty).min(1).optional(),
});

const choiceExerciseSchema = z.object({
  type: z.literal("exercise"),
  id: nonEmpty,
  ruleId: nonEmpty,
  kind: z.literal("choice"),
  prompt: nonEmpty,
  options: z.array(nonEmpty).min(2),
  answer: nonEmpty,
});

const gapExerciseSchema = z.object({
  type: z.literal("exercise"),
  id: nonEmpty,
  ruleId: nonEmpty,
  kind: z.literal("gap"),
  prompt: nonEmpty,
  answer: nonEmpty,
  accept: z.array(nonEmpty).optional(),
});

const transformExerciseSchema = z.object({
  type: z.literal("exercise"),
  id: nonEmpty,
  ruleId: nonEmpty,
  kind: z.literal("transform"),
  prompt: nonEmpty,
  source: nonEmpty,
  answer: nonEmpty,
  accept: z.array(nonEmpty).optional(),
});

const pickSentenceExerciseSchema = z.object({
  type: z.literal("exercise"),
  id: nonEmpty,
  ruleId: nonEmpty,
  kind: z.literal("pick-sentence"),
  prompt: nonEmpty,
  options: z.array(nonEmpty).length(2),
  answer: nonEmpty,
});

export const exerciseSchema = z.discriminatedUnion("kind", [
  choiceExerciseSchema,
  gapExerciseSchema,
  transformExerciseSchema,
  pickSentenceExerciseSchema,
]);

const explanationBlockSchema = z.object({
  type: z.literal("explanation"),
  ruleId: nonEmpty.optional(),
  md: nonEmpty,
});

const headingBlockSchema = z.object({
  type: z.literal("heading"),
  title: nonEmpty,
});

const tableBlockSchema = z.object({
  type: z.literal("table"),
  headers: z.array(nonEmpty).min(1),
  rows: z.array(z.array(z.string().min(1))).min(1),
});

const exampleBlockSchema = z.object({
  type: z.literal("example"),
  en: nonEmpty,
  ru: nonEmpty,
});

const pitfallBlockSchema = z.object({
  type: z.literal("pitfall"),
  ruleId: nonEmpty.optional(),
  md: nonEmpty,
});

const rulesBlockSchema = z.object({
  type: z.literal("rules"),
  items: z
    .array(
      z.object({
        tag: nonEmpty,
        md: nonEmpty,
      }),
    )
    .min(1),
});

const recapBlockSchema = z.object({
  type: z.literal("recap"),
  items: z
    .array(
      z.object({
        k: nonEmpty,
        v: nonEmpty,
      }),
    )
    .min(1),
});

export const blockSchema = z.union([
  explanationBlockSchema,
  headingBlockSchema,
  tableBlockSchema,
  exampleBlockSchema,
  pitfallBlockSchema,
  rulesBlockSchema,
  recapBlockSchema,
  exerciseSchema,
]);

const ruleCardRowSchema = z.object({
  label: nonEmpty,
  form: nonEmpty,
  ruleId: nonEmpty.optional(),
});

export const ruleCardSchema = z.object({
  rows: z.array(ruleCardRowSchema).min(1),
  note: nonEmpty,
});

export const lessonSchema = z.object({
  slug: nonEmpty,
  title: nonEmpty,
  titleRu: nonEmpty,
  /** Sitting length on the course outline. Falls back by lesson kind if omitted. */
  estMinutes: z.number().int().positive().optional(),
  /** Compact recap shown under a practice question. */
  ruleCard: ruleCardSchema.optional(),
  blocks: z.array(blockSchema).min(1),
});

export const bankSchema = z.array(exerciseSchema).min(1);

const availableCatalogEntrySchema = z.object({
  slug: nonEmpty,
  status: z.literal("available"),
});

const comingCatalogEntrySchema = z.object({
  slug: nonEmpty,
  status: z.literal("coming"),
  title: nonEmpty,
  titleRu: nonEmpty,
});

export const catalogEntrySchema = z.discriminatedUnion("status", [
  availableCatalogEntrySchema,
  comingCatalogEntrySchema,
]);

export const catalogGroupSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  titleRu: nonEmpty,
  courses: z.array(catalogEntrySchema).min(1),
});

export const catalogSchema = z.object({
  groups: z.array(catalogGroupSchema).min(1),
});

export type Rule = z.infer<typeof ruleSchema>;
export type CourseMeta = z.infer<typeof courseSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type RuleCard = z.infer<typeof ruleCardSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type TheoryBlock = Exclude<Block, Exercise>;

export function isExerciseBlock(block: Block): block is Exercise {
  return block.type === "exercise";
}

export function isTheoryBlock(block: Block): block is TheoryBlock {
  return block.type !== "exercise";
}

/** Canonical answer plus any listed variants (`doesn't` / `does not`). */
export function acceptedAnswers(exercise: Exercise): string[] {
  const extra = "accept" in exercise && exercise.accept ? exercise.accept : [];
  return [exercise.answer, ...extra];
}
