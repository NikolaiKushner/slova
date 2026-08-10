/**
 * Cleanup for words arriving from a pasted lesson list or a machine translator.
 * Everything here is deterministic — no network, no guessing at meaning. The
 * goal is to remove artefacts of *how* the text arrived (list markers, quotes
 * that wrapped a cell, a period that ended a sentence in the source document),
 * not to correct the translation itself.
 */

/**
 * `1.` `2)` `-` `•` `*` `а)` at the start of a pasted line. A numbered marker
 * needs no space after it — MyMemory returns "1.Поставьте диагноз" — but it
 * must be followed by a letter, so a decimal like "1.5" survives.
 */
const LIST_MARKER = /^(?:[-–—•*]\s+|\d+[.)]\s*(?=\p{L})|[a-zа-я][.)]\s+)/u;

/** Quote characters a document or a CSV export may wrap a cell in. */
const WRAPPING_QUOTES = /^[""«»„“”'`]+|[""«»„“”'`]+$/gu;

/**
 * MyMemory sometimes returns a Wikipedia anchor instead of a translation:
 * `Фразеологизм#.D0.A4.D1.80.D0.B0...`. Everything from the `#` is junk.
 */
const WIKI_ANCHOR = /#[.\w]*$/u;

/** Sentence punctuation at the end of what should be a dictionary entry. */
const TRAILING_PUNCTUATION = /[.,;:]+$/u;

/** All-caps tokens are acronyms — MRI, AI, ИИ — and keep their case. */
const ACRONYM = /^[\p{Lu}\p{N}][\p{Lu}\p{N}.-]*$/u;

/** Strip the artefacts of pasting, without touching the words themselves. */
export function cleanCell(raw: string): string {
  // Trim first: the quote and marker patterns are anchored to the edges.
  let text = raw.trim().replace(LIST_MARKER, "");
  text = text.replace(WRAPPING_QUOTES, "");
  text = text.replace(WIKI_ANCHOR, "");
  text = text.replace(/\s+/gu, " ").trim();

  // A period ending an acronym ("т.д.") is part of the word; one ending a
  // sentence is not. Only drop it when a letter sits in front of it.
  if (!ACRONYM.test(text)) {
    text = text.replace(TRAILING_PUNCTUATION, "");
  }

  return text.trim();
}

/** A capital anywhere but the first character means the phrase holds a name. */
function hasInternalCapital(text: string): boolean {
  return /\p{Lu}/u.test(text.slice(1));
}

/**
 * Lowercase a phrase that was only capitalised because it began a line or a
 * cell. Acronyms and phrases containing a name ("New York", "Sofia's") are
 * left alone; a single-word proper noun is indistinguishable from an ordinary
 * word here and will be lowercased — the import table is editable for exactly
 * that reason.
 */
export function decapitalize(text: string): string {
  if (!text) return text;
  if (ACRONYM.test(text)) return text;
  if (hasInternalCapital(text)) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/**
 * Give the translation the case its source word ended up with. The English
 * column is the better signal: English capitalises proper nouns, so a
 * lowercase source means the translation is an ordinary word too.
 */
export function matchCase(source: string, translation: string): string {
  if (!translation) return translation;
  if (ACRONYM.test(translation) || hasInternalCapital(translation)) {
    return translation;
  }
  return /\p{Lu}/u.test(source[0] ?? "")
    ? translation
    : decapitalize(translation);
}

/**
 * True when a Cyrillic-target translation came back in Latin script — how
 * MyMemory renders "medical records" as "ISTORIIA BOLEZNI". A transliteration
 * is worse than a blank: it looks like an answer and teaches nothing.
 */
export function looksTransliterated(translation: string): boolean {
  const letters = translation.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  const cyrillic = letters.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;
  return cyrillic / letters.length < 0.5;
}

/** Full pass over one imported row. */
export function normalizeRow(front: string, back: string) {
  const cleanFront = decapitalize(cleanCell(front));
  const cleanBack = matchCase(cleanFront, cleanCell(back));
  return { front: cleanFront, back: cleanBack };
}
