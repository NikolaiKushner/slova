import { z } from "zod";
import { exerciseSchema } from "@/content/courses/schema";

/**
 * The shape of a story on disk. Cross-field checks — word count, id
 * uniqueness, annotation offset resolution, question order — live in
 * `lib/stories/validate.ts`, the same split `content/courses/schema.ts` and
 * `lib/courses/load.ts` use: this file is structure only.
 *
 * See `docs/plans/stories.md` §5.1 for the field-by-field rationale.
 */

const nonEmpty = z.string().trim().min(1);

export const ANNOTATION_ROLES = ["focus", "phrase", "support"] as const;
export type AnnotationRole = (typeof ANNOTATION_ROLES)[number];

export const paragraphSchema = z.object({
  id: nonEmpty,
  text: nonEmpty,
});

export const annotationSchema = z.object({
  id: nonEmpty,
  paragraphId: nonEmpty,
  surface: nonEmpty,
  /** 1-based occurrence of `surface` within that paragraph. */
  occurrence: z.number().int().positive(),
  lemma: nonEmpty,
  /** The meaning in this sentence, not a general translation. */
  glossRu: nonEmpty,
  role: z.enum(ANNOTATION_ROLES),
});

export const storyFileSchema = z.object({
  slug: nonEmpty,
  schemaVersion: z.literal(1),
  level: z.enum(["A1", "A2"]),
  topic: nonEmpty,
  /** Slug of the blueprint this story was drafted from. */
  blueprint: nonEmpty,
  title: nonEmpty,
  descriptionRu: nonEmpty,
  paragraphs: z.array(paragraphSchema).min(3).max(5),
  annotations: z.array(annotationSchema).min(1),
  questions: z.tuple([exerciseSchema, exerciseSchema, exerciseSchema]),
});

/**
 * The authoring brief a story is drafted from. Nothing at runtime reads
 * these — they exist so a replacement draft can be regenerated later
 * (docs/plans/stories.md §8) — but they are still structured and tested so a
 * malformed brief is caught before it costs a drafting round trip.
 */
export const blueprintSchema = z.object({
  slug: nonEmpty,
  level: z.enum(["A1", "A2"]),
  topic: nonEmpty,
  /** One or two sentences: what happens in the story. */
  premise: nonEmpty,
  /** The 5-8 lemmas the story should build annotations around. */
  focusLemmas: z.array(nonEmpty).min(5).max(8),
  notes: nonEmpty.optional(),
});

/**
 * Reading order: catalog position is the tie-break in
 * docs/plans/stories.md §5.3, after "yours" count. A story's level comes
 * from the story file itself — the catalog does not repeat it, so the two
 * can't drift apart.
 */
export const catalogSchema = z.array(nonEmpty).min(1);

export type Paragraph = z.infer<typeof paragraphSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type StoryFile = z.infer<typeof storyFileSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
