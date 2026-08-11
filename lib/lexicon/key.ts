/**
 * The lookup key for a word, in the shared base and in a user's own list.
 *
 * Two jobs, one function, on purpose: `UserWord.key` decides whether importing
 * a word you already have updates that row or creates a second one, and
 * `Lexeme.key` decides whether a translation is already known. If the two ever
 * normalized differently, a seeded base would fail to answer for words it
 * contains, and the failure would be silent — a miss looks exactly like a word
 * nobody has seen.
 *
 * It folds away how a word was written down, never what it says. Case, the
 * markers and quotes a paste drags in, and Russian's ё/е spelling variance all
 * go. Hyphens, apostrophes and slashes stay: `e-mail`, `don't` and `was/were`
 * are different entries from `email`, `dont` and `was were`.
 */

/**
 * `1.` `2)` `-` `•` `*` `а)` at the start of a pasted line. A numbered marker
 * must not be followed by another digit, so a decimal like `1.5` survives.
 */
const LIST_MARKER = /^(?:[-–—•*]\s+|\d+[.)]\s*(?!\d)|[a-zа-яё][.)]\s+)/iu;

/** Quotes a document or CSV export may have wrapped a cell in. */
const WRAPPING_QUOTES = /^[""«»„“”'`]+|[""«»„“”'`]+$/gu;

/** Sentence punctuation at the edges of what should be a dictionary entry. */
const EDGE_PUNCTUATION = /^[.,;:!?]+|[.,;:!?]+$/gu;

export function normalizeKey(raw: string): string {
  let key = raw.normalize("NFC").trim();

  // These three nest in any order — `1. "Medical Records."` has all of them,
  // and stripping the quote only exposes the marker underneath. Repeat until
  // nothing more comes off, rather than guessing at an order that works.
  for (let pass = 0; pass < 5; pass++) {
    const before = key;
    key = key.replace(LIST_MARKER, "");
    key = key.replace(WRAPPING_QUOTES, "");
    key = key.replace(EDGE_PUNCTUATION, "");
    key = key.trim();
    if (key === before) break;
  }

  // Every kind of space, including the non-breaking ones Word likes to paste.
  key = key.replace(/\s+/gu, " ").trim();

  key = key.toLowerCase();
  // ё and е are the same word spelled two ways; nobody searches for the
  // difference, and half of Russian text drops the diaeresis anyway.
  key = key.replace(/ё/g, "е");

  return key;
}

/** True when two spellings are the same entry. */
export function sameKey(a: string, b: string): boolean {
  return normalizeKey(a) === normalizeKey(b);
}
