import { normalizeKey } from "@/lib/lexicon/key";
import { isPartOfSpeech, type PartOfSpeech } from "@/lib/llm/prompt";
import { cleanCell, looksTransliterated, matchCase } from "@/lib/normalize";

/**
 * Reading the seed file.
 *
 * Kept separate from the script that loads it so the rules can be tested on a
 * fixture: a seeding run is tens of thousands of rows against the real
 * database, and finding out there that line 4,812 is malformed is the wrong
 * place to find out.
 *
 * The file is JSONL rather than one big JSON array for exactly one reason: a
 * broken line costs one word, not the whole run.
 */

export type DatasetEntry = {
  /** As written, for display. */
  text: string;
  /** normalizeKey(text) — what the runtime will look words up by. */
  key: string;
  translation: string;
  /** IPA without slashes. Absent when the file has none or it failed the check. */
  transcription?: string;
  /** Absent when the file has none or the value is outside the vocabulary. */
  partOfSpeech?: PartOfSpeech;
};

export type ParseWarning = {
  line: number;
  reason: string;
  content: string;
};

/**
 * Enrichment fields thrown away, counted rather than warned about.
 *
 * A warning means a line was skipped, and the loader prints it that way. A bad
 * transcription is not that: the translation on the line is still worth having
 * and still gets stored, so dropping the field must not read as losing the
 * word. Counted, because silently discarding model output is how a prompt
 * regression goes unnoticed for a whole run.
 */
export type ParseDropped = {
  transcription: number;
  partOfSpeech: number;
};

export type ParseResult = {
  entries: DatasetEntry[];
  warnings: ParseWarning[];
  dropped: ParseDropped;
};

/** `/ˈwɔːtər/` and `[ˈwɔːtər]` are the same transcription written three ways. */
const WRAPPING_IPA_DELIMITERS = /^[/[\]]+|[/[\]]+$/gu;

/**
 * Comfortably past the longest real transcription in the base — `artificial
 * intelligence` runs to about 25 characters — and short enough to catch an
 * answer that turned into an explanation.
 */
const MAX_TRANSCRIPTION_LENGTH = 48;

/**
 * A character outside printable ASCII. Written as a range rather than `\x00`
 * so no control character appears in the pattern.
 */
const NON_ASCII = /[^ -~]/u;

/**
 * Two checks, because length alone is not a signal: a model that answers with
 * prose instead of IPA writes something like `roughly wah-ter`, which is
 * shorter than a transcribed phrase and would sail through a size limit.
 *
 * What separates them is the alphabet. IPA borrows the Latin letters, so
 * script cannot identify it on its own — but English IPA always reaches for
 * something outside plain ASCII: a stress mark in `ˈwɔːtər`, a length mark, or
 * one of the vowels that has no ASCII spelling at all (`kæt`, `pɪn`, `bɛd`).
 * Prose spelled out in Latin letters has none of those. Cyrillic is the
 * opposite failure — the model answering in the wrong alphabet entirely, the
 * same one `looksTransliterated` catches on the translation side.
 *
 * It fails safe in the direction that matters: a real transcription wrongly
 * dropped is a word without IPA, while prose wrongly stored is a word that
 * teaches the wrong pronunciation and is never asked about again.
 */
function usableTranscription(raw: string): string | null {
  const text = cleanCell(raw).replace(WRAPPING_IPA_DELIMITERS, "").trim();
  if (!text || text.length > MAX_TRANSCRIPTION_LENGTH) return null;
  if (/\p{Script=Cyrillic}/u.test(text)) return null;
  if (!NON_ASCII.test(text)) return null;
  return text;
}

/**
 * Every entry goes through the same `normalizeKey` and the same cleanup the
 * import path uses. This is not tidiness — a seed normalised by different
 * rules than the runtime would fail to answer for words it demonstrably
 * contains, and a miss is indistinguishable from a word nobody has seen.
 */
export function parseDataset(text: string): ParseResult {
  const entries: DatasetEntry[] = [];
  const warnings: ParseWarning[] = [];
  const dropped: ParseDropped = { transcription: 0, partOfSpeech: 0 };
  const seen = new Map<string, number>();

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const lineNumber = i + 1;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      warnings.push({ line: lineNumber, reason: "not JSON", content: raw });
      continue;
    }

    if (typeof parsed !== "object" || parsed === null) {
      warnings.push({ line: lineNumber, reason: "not an object", content: raw });
      continue;
    }

    const record = parsed as Record<string, unknown>;
    if (typeof record.text !== "string" || typeof record.translation !== "string") {
      warnings.push({
        line: lineNumber,
        reason: "text and translation must both be strings",
        content: raw,
      });
      continue;
    }

    const source = cleanCell(record.text);
    const translation = matchCase(source, cleanCell(record.translation));
    const key = normalizeKey(source);

    if (!key) {
      warnings.push({ line: lineNumber, reason: "empty word", content: raw });
      continue;
    }

    // An empty translation is the model saying it could not translate this —
    // a real answer, and the one thing that must never reach the base. Stored,
    // it would count as a hit forever and the word would never be re-asked.
    if (!translation) {
      warnings.push({
        line: lineNumber,
        reason: "no translation — the model declined this word",
        content: raw,
      });
      continue;
    }

    // A Russian translation is written in Russian. Four entries in the first
    // generated set came back in Chinese and one was the English word copied
    // back — a rate of 0.05%, and permanent if stored. The same check already
    // guards the MyMemory path against transliteration.
    if (looksTransliterated(translation)) {
      warnings.push({
        line: lineNumber,
        reason: "translation is not in the target script",
        content: raw,
      });
      continue;
    }

    const first = seen.get(key);
    if (first !== undefined) {
      warnings.push({
        line: lineNumber,
        reason: `duplicate of line ${first}`,
        content: raw,
      });
      continue;
    }

    seen.set(key, lineNumber);

    // Absent and unusable are the same outcome here — the entry lands without
    // the field. A blank stored in the column would read as "we looked and
    // there is none", which is exactly the confusion the empty translation
    // rule above exists to prevent.
    let transcription: string | null = null;
    if (typeof record.transcription === "string" && record.transcription.trim()) {
      transcription = usableTranscription(record.transcription);
      if (!transcription) dropped.transcription += 1;
    }

    let partOfSpeech: PartOfSpeech | null = null;
    if (typeof record.partOfSpeech === "string" && record.partOfSpeech.trim()) {
      const candidate = record.partOfSpeech.trim().toLowerCase();
      if (isPartOfSpeech(candidate)) partOfSpeech = candidate;
      else dropped.partOfSpeech += 1;
    }

    entries.push({
      text: source,
      key,
      translation,
      ...(transcription ? { transcription } : {}),
      ...(partOfSpeech ? { partOfSpeech } : {}),
    });
  }

  return { entries, warnings, dropped };
}

/** Word or phrase — the shared base keeps both, and tells them apart by this. */
export function kindOf(text: string): "word" | "phrase" {
  return text.includes(" ") ? "phrase" : "word";
}
