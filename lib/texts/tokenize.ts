import { normalizeKey } from "@/lib/lexicon/key";

/**
 * Turning a pasted text into what the reader screen shows — docs/plans/reader.md
 * §5. Pure and dependency-free: the lemmatizer is injected, so the spans and
 * the counts are testable without loading a language model.
 */

export const PARSED_VERSION = 1;

export type TokenSpan = { start: number; end: number };

export type TextToken = {
  /** `paragraph:index`. The gloss cache and the popover address a token by it. */
  id: string;
  start: number;
  end: number;
  /** `normalizeKey` of the surface, as written. */
  key: string;
  /** Dictionary form, or `key` when nothing resolved it. */
  lemma: string;
};

export type ParsedParagraph = {
  id: number;
  text: string;
  tokens: TextToken[];
};

export type ParsedText = {
  version: number;
  paragraphs: ParsedParagraph[];
  wordCount: number;
  charCount: number;
};

export type Lemmatizer = (
  text: string,
  spans: readonly TokenSpan[],
) => (string | null)[];

/**
 * A run of letters, held together by the inner apostrophes and hyphens
 * `normalizeKey` also keeps: `don't` and `e-mail` are one word each. The
 * lookbehind stops `1990s` from contributing a token `s`.
 */
const WORD = /(?<![\p{L}\p{N}])\p{L}[\p{L}\p{M}]*(?:['’-][\p{L}\p{M}]+)*/gu;

export function splitParagraphs(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function tokenSpans(text: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  for (const match of text.matchAll(WORD)) {
    const start = match.index;
    spans.push({ start, end: start + match[0].length });
  }
  return spans;
}

export function parseText(body: string, lemmatize?: Lemmatizer): ParsedText {
  const paragraphs: ParsedParagraph[] = [];
  let wordCount = 0;

  for (const [id, text] of splitParagraphs(body).entries()) {
    const spans = tokenSpans(text);
    const lemmas = lemmatize?.(text, spans) ?? [];

    const tokens = spans.map((span, index) => {
      const key = normalizeKey(text.slice(span.start, span.end));
      const lemma = lemmas[index];
      return {
        id: `${id}:${index}`,
        start: span.start,
        end: span.end,
        key,
        lemma: lemma && lemma !== key ? lemma : key,
      };
    });

    wordCount += tokens.length;
    paragraphs.push({ id, text, tokens });
  }

  return {
    version: PARSED_VERSION,
    paragraphs,
    wordCount,
    charCount: body.length,
  };
}

/** Sentence boundary: a full stop, question or exclamation mark, then a space. */
const SENTENCE_END = /[.!?]["'”’)\]]*\s/gu;

/**
 * The one sentence a token sits in, for the gloss request. Never the whole
 * text: docs/plans/reader.md §7 makes that the rule rather than an accident.
 */
export function sentenceAround(text: string, span: TokenSpan): string {
  let start = 0;
  for (const match of text.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].length;
    if (end > span.start) break;
    start = end;
  }

  SENTENCE_END.lastIndex = 0;
  let end = text.length;
  for (const match of text.matchAll(SENTENCE_END)) {
    if (match.index >= span.end) {
      end = match.index + match[0].length;
      break;
    }
  }

  return text.slice(start, end).trim();
}
