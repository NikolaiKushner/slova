import type { Annotation, Paragraph } from "@/content/stories/schema";
import { resolveAnnotationSpan, type AnnotationSpan } from "@/lib/stories/validate";
import { type RatedWord, ratingOf } from "@/lib/word-rating";

/**
 * Turning story data into what the reader screen shows — docs/plans/shipped/stories.md
 * §6.3. Pure, so the span math and the popover's dictionary-state text are
 * both testable without mounting anything.
 */

export type ParagraphSegment =
  | { kind: "text"; text: string }
  | { kind: "annotation"; text: string; annotation: Annotation };

/**
 * Splits a paragraph into plain-text runs and tappable annotation spans.
 *
 * `lib/stories/validate.ts` already guarantees that any two overlapping
 * annotations in a paragraph have a `phrase` as the outer one, so this only
 * has to keep the first (outer) span at each position and drop whatever
 * starts inside it — tapping anywhere in "give up" then opens the phrase,
 * never the word underneath it.
 */
export function buildParagraphSegments(
  paragraph: Paragraph,
  annotations: readonly Annotation[],
): ParagraphSegment[] {
  const resolved = annotations
    .filter((annotation) => annotation.paragraphId === paragraph.id)
    .map((annotation) => ({
      annotation,
      span: resolveAnnotationSpan(
        paragraph.text,
        annotation.surface,
        annotation.occurrence,
      ),
    }))
    .filter(
      (item): item is { annotation: Annotation; span: AnnotationSpan } =>
        item.span !== null,
    )
    .sort((a, b) => a.span.start - b.span.start || b.span.end - a.span.end);

  const chosen: { annotation: Annotation; span: AnnotationSpan }[] = [];
  for (const item of resolved) {
    const outer = chosen[chosen.length - 1];
    if (outer && item.span.start < outer.span.end) continue;
    chosen.push(item);
  }

  const segments: ParagraphSegment[] = [];
  let cursor = 0;
  for (const { annotation, span } of chosen) {
    if (span.start > cursor) {
      segments.push({ kind: "text", text: paragraph.text.slice(cursor, span.start) });
    }
    segments.push({
      kind: "annotation",
      text: paragraph.text.slice(span.start, span.end),
      annotation,
    });
    cursor = span.end;
  }
  if (cursor < paragraph.text.length) {
    segments.push({ kind: "text", text: paragraph.text.slice(cursor) });
  }

  return segments;
}

export type DictionaryState = "absent" | "learning" | "known";

/**
 * The gloss popover's three-line dictionary state — a different split from
 * `lib/stories/select.ts`'s `classify`. Selection counts "seen but never
 * studied" as new on purpose; here a row is a row, so it reads as "Учите"
 * the moment it exists, whatever its rating.
 */
export function dictionaryStateOf(record: RatedWord | undefined): DictionaryState {
  if (!record) return "absent";
  return ratingOf(record) === 5 ? "known" : "learning";
}
