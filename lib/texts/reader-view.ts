import { dictionaryStateOf, type DictionaryState } from "@/lib/stories/reader-view";
import type { ParsedParagraph } from "@/lib/texts/tokenize";
import type { RatedWord } from "@/lib/word-rating";

/**
 * Turning tokenizer output into what the text reader shows —
 * docs/plans/shipped/reader.md §6.3. Pure, so the dictionary matching is testable
 * without a database.
 */

export type ReaderWord = {
  id: string;
  text: string;
  key: string;
  lemma: string;
  state: DictionaryState;
  /** From the shared base, when it answers for this word. */
  translation: string | null;
};

export type ReaderSegment =
  | { kind: "text"; text: string }
  | { kind: "word"; word: ReaderWord };

export type ReaderParagraph = { id: number; segments: ReaderSegment[] };

/** The surface as written first, then its dictionary form. */
function resolve<T>(
  word: { key: string; lemma: string },
  from: ReadonlyMap<string, T>,
): T | undefined {
  return from.get(word.key) ?? from.get(word.lemma);
}

export function buildReaderParagraphs(
  paragraphs: readonly ParsedParagraph[],
  dictionary: ReadonlyMap<string, RatedWord>,
  translations: ReadonlyMap<string, string>,
): ReaderParagraph[] {
  return paragraphs.map((paragraph) => {
    const segments: ReaderSegment[] = [];
    let cursor = 0;

    for (const token of paragraph.tokens) {
      if (token.start > cursor) {
        segments.push({
          kind: "text",
          text: paragraph.text.slice(cursor, token.start),
        });
      }
      segments.push({
        kind: "word",
        word: {
          id: token.id,
          text: paragraph.text.slice(token.start, token.end),
          key: token.key,
          lemma: token.lemma,
          state: dictionaryStateOf(resolve(token, dictionary)),
          translation: resolve(token, translations) ?? null,
        },
      });
      cursor = token.end;
    }

    if (cursor < paragraph.text.length) {
      segments.push({ kind: "text", text: paragraph.text.slice(cursor) });
    }

    return { id: paragraph.id, segments };
  });
}

/** Every key worth asking the shared base and the dictionary about. */
export function uniqueKeys(paragraphs: readonly ParsedParagraph[]): string[] {
  const keys = new Set<string>();
  for (const paragraph of paragraphs) {
    for (const token of paragraph.tokens) {
      keys.add(token.key);
      keys.add(token.lemma);
    }
  }
  return [...keys];
}
