import { normalizeKey } from "@/lib/lexicon/key";
import { cleanCell, matchCase } from "@/lib/normalize";

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
};

export type ParseWarning = {
  line: number;
  reason: string;
  content: string;
};

export type ParseResult = {
  entries: DatasetEntry[];
  warnings: ParseWarning[];
};

/**
 * Every entry goes through the same `normalizeKey` and the same cleanup the
 * import path uses. This is not tidiness — a seed normalised by different
 * rules than the runtime would fail to answer for words it demonstrably
 * contains, and a miss is indistinguishable from a word nobody has seen.
 */
export function parseDataset(text: string): ParseResult {
  const entries: DatasetEntry[] = [];
  const warnings: ParseWarning[] = [];
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
    entries.push({ text: source, key, translation });
  }

  return { entries, warnings };
}

/** Word or phrase — the shared base keeps both, and tells them apart by this. */
export function kindOf(text: string): "word" | "phrase" {
  return text.includes(" ") ? "phrase" : "word";
}
