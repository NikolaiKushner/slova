/**
 * A set title as it fits on a table badge: short names stay, long ones
 * collapse to initials so the column can stay one line.
 */

const SHORT_ENOUGH = 10;
const SKIP = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "в",
  "для",
  "и",
  "из",
  "к",
  "на",
  "по",
  "с",
]);

/** How many set badges a row shows before the rest collapse into +N. */
export const VISIBLE_SET_BADGES = 2;

export function shortenSetTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  if ([...trimmed].length <= SHORT_ENOUGH) return trimmed;

  const tokens = trimmed.split(/[\s-]+/).filter(Boolean);
  const significant = tokens.filter(
    (token) => !SKIP.has(token.toLowerCase()),
  );
  const source = significant.length > 0 ? significant : tokens;

  if (source.length === 1) {
    return [...source[0]!].slice(0, 3).join("");
  }

  return source
    .map((token) => [...token][0])
    .filter((letter): letter is string => Boolean(letter))
    .map((letter) => letter.toUpperCase())
    .join("");
}
