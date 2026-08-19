import { acceptedAnswers } from "@/content/courses/schema";
import type { StoryFile } from "@/content/stories/schema";

/**
 * The deterministic checks from docs/plans/stories.md §5.2 — everything
 * `content/stories/schema.ts` cannot express as plain structure, because it
 * depends on more than one field. Mirrors `assertCourse` in
 * `lib/courses/load.ts`: takes an already-parsed file, throws on the first
 * violation.
 */

export class StoryContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryContentError";
  }
}

const MIN_WORDS = 120;
const MAX_WORDS = 180;
const MIN_FOCUS = 5;
const MAX_FOCUS = 8;
const CYRILLIC = /\p{Script=Cyrillic}/u;

export type AnnotationSpan = { start: number; end: number };

/**
 * Character offsets of the `occurrence`-th match of `surface` in
 * `paragraphText`, or null if it does not occur that many times. The author
 * never writes offsets — this is what resolves them, here and later in
 * `lib/stories/load.ts`.
 */
export function resolveAnnotationSpan(
  paragraphText: string,
  surface: string,
  occurrence: number,
): AnnotationSpan | null {
  let searchFrom = 0;
  let start = -1;
  for (let i = 0; i < occurrence; i++) {
    start = paragraphText.indexOf(surface, searchFrom);
    if (start === -1) return null;
    searchFrom = start + surface.length;
  }
  return { start, end: start + surface.length };
}

export function validateStory(story: StoryFile): void {
  assertWordCount(story);
  assertNoRussian(story);
  assertUniqueIds(story);
  assertFocusCount(story);
  assertAnnotationSpans(story);
  assertQuestionShape(story);
  assertCloze(story);
}

/** Also used by `lib/stories/load.ts` to derive the catalog's word count. */
export function storyWordCount(story: StoryFile): number {
  return story.paragraphs.reduce(
    (total, paragraph) =>
      total + paragraph.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

function assertWordCount(story: StoryFile): void {
  const count = storyWordCount(story);
  if (count < MIN_WORDS || count > MAX_WORDS) {
    throw new StoryContentError(
      `${story.slug}: expected ${MIN_WORDS}-${MAX_WORDS} words, got ${count}.`,
    );
  }
}

function assertNoRussian(story: StoryFile): void {
  for (const paragraph of story.paragraphs) {
    if (CYRILLIC.test(paragraph.text)) {
      throw new StoryContentError(
        `${story.slug}: paragraph "${paragraph.id}" contains Russian text.`,
      );
    }
  }
}

function assertUniqueIds(story: StoryFile): void {
  const ids = [
    ...story.paragraphs.map((p) => p.id),
    ...story.annotations.map((a) => a.id),
    ...story.questions.map((q) => q.id),
  ];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new StoryContentError(`${story.slug}: duplicate id "${id}".`);
    }
    seen.add(id);
  }
}

function assertFocusCount(story: StoryFile): void {
  const count = story.annotations.filter((a) => a.role === "focus").length;
  if (count < MIN_FOCUS || count > MAX_FOCUS) {
    throw new StoryContentError(
      `${story.slug}: expected ${MIN_FOCUS}-${MAX_FOCUS} focus annotations, got ${count}.`,
    );
  }
}

function assertAnnotationSpans(story: StoryFile): void {
  const paragraphText = new Map(story.paragraphs.map((p) => [p.id, p.text]));
  const spans = new Map<string, AnnotationSpan>();

  for (const annotation of story.annotations) {
    const text = paragraphText.get(annotation.paragraphId);
    if (text === undefined) {
      throw new StoryContentError(
        `${story.slug}: annotation "${annotation.id}" names unknown paragraph "${annotation.paragraphId}".`,
      );
    }
    const span = resolveAnnotationSpan(
      text,
      annotation.surface,
      annotation.occurrence,
    );
    if (span === null) {
      throw new StoryContentError(
        `${story.slug}: annotation "${annotation.id}" — "${annotation.surface}" ` +
          `(occurrence ${annotation.occurrence}) not found in paragraph "${annotation.paragraphId}".`,
      );
    }
    spans.set(annotation.id, span);
  }

  for (const paragraph of story.paragraphs) {
    const inParagraph = story.annotations.filter(
      (a) => a.paragraphId === paragraph.id,
    );
    for (let i = 0; i < inParagraph.length; i++) {
      for (let j = i + 1; j < inParagraph.length; j++) {
        const a = inParagraph[i];
        const b = inParagraph[j];
        const spanA = spans.get(a.id)!;
        const spanB = spans.get(b.id)!;
        if (!overlaps(spanA, spanB)) continue;
        const outer = contains(spanA, spanB)
          ? a
          : contains(spanB, spanA)
            ? b
            : null;
        if (outer?.role !== "phrase") {
          throw new StoryContentError(
            `${story.slug}: annotations "${a.id}" and "${b.id}" overlap in ` +
              `paragraph "${paragraph.id}" without a phrase.`,
          );
        }
      }
    }
  }
}

function overlaps(a: AnnotationSpan, b: AnnotationSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

function contains(outer: AnnotationSpan, inner: AnnotationSpan): boolean {
  return outer.start <= inner.start && outer.end >= inner.end;
}

function assertQuestionShape(story: StoryFile): void {
  const kinds = story.questions.map((q) => q.kind);
  if (kinds[0] !== "choice" || kinds[1] !== "choice" || kinds[2] !== "gap") {
    throw new StoryContentError(
      `${story.slug}: questions must be choice, choice, gap — got ${kinds.join(", ")}.`,
    );
  }

  for (const question of story.questions) {
    if (question.kind !== "choice" && question.kind !== "pick-sentence") {
      continue;
    }
    if (new Set(question.options).size !== question.options.length) {
      throw new StoryContentError(
        `${story.slug}: question "${question.id}" repeats an option.`,
      );
    }
    if (!question.options.includes(question.answer)) {
      throw new StoryContentError(
        `${story.slug}: question "${question.id}" answer is not among its options.`,
      );
    }
  }
}

/** The cloze is the third question — enforced by `assertQuestionShape`. */
function assertCloze(story: StoryFile): void {
  const cloze = story.questions[2];
  const fullText = story.paragraphs.map((p) => p.text).join(" ");
  if (fullText.includes(cloze.prompt)) {
    throw new StoryContentError(
      `${story.slug}: cloze prompt "${cloze.prompt}" appears verbatim in the story text.`,
    );
  }

  const focusLemmas = new Set(
    story.annotations
      .filter((a) => a.role === "focus")
      .map((a) => a.lemma.toLowerCase()),
  );
  const answers = acceptedAnswers(cloze).map((a) => a.toLowerCase());
  if (!answers.some((answer) => focusLemmas.has(answer))) {
    throw new StoryContentError(
      `${story.slug}: cloze answer "${cloze.answer}" is not a focus lemma.`,
    );
  }
}
