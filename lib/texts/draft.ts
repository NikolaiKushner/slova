import { splitParagraphs } from "@/lib/texts/tokenize";

/**
 * What a paste has to satisfy before it becomes a row — docs/plans/reader.md
 * §5.1. Two constants and a title, not a quota system.
 */

export const MAX_TEXT_CHARS = 20_000;
export const MAX_TEXTS = 20;
export const MAX_TITLE_CHARS = 120;

/** The first line, cut at a word boundary. Empty when there is nothing to cut. */
export function titleFrom(body: string): string {
  const first = splitParagraphs(body)[0] ?? "";
  if (first.length <= MAX_TITLE_CHARS) return first;

  const cut = first.slice(0, MAX_TITLE_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > MAX_TITLE_CHARS / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
