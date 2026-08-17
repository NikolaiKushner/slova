import { normalizeKey } from "@/lib/lexicon/key";
import { cleanCell } from "@/lib/normalize";

/**
 * The two forms a verb-forms question asks for.
 *
 * `past` is the one shown as the answer; `acceptPast` is extra spellings that
 * also count, which today is only `were` next to `was`. Stored on the lexeme
 * as JSON so a later third form is a migration, not a rewrite of every row.
 */

export type VerbForms = {
  past: string;
  participle: string;
  acceptPast?: string[];
  /** Meaning from the verb table, not from a homograph's dictionary row. */
  gloss?: string;
  /** Course grouping: `same`, `two-alike`, `vowel`, `en`, `special`. */
  family?: string;
  /** Position in the curated table; intros take the lowest ranks first. */
  rank?: number;
};

export type VerbTableEntry = {
  text: string;
  key: string;
  translation: string;
  forms: VerbForms;
};

function extraForms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => cleanCell(item))
    .filter(Boolean);
}

/**
 * A stored `Lexeme.forms` value, or nothing. Anything that is not two
 * non-empty strings is treated as absent: a bad shape must not become a
 * question with a blank to fill in.
 */
export function asVerbForms(value: unknown): VerbForms | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const past = typeof record.past === "string" ? cleanCell(record.past) : "";
  const participle =
    typeof record.participle === "string" ? cleanCell(record.participle) : "";
  if (!past || !participle) return null;

  const acceptPast = extraForms(record.acceptPast).filter(
    (form) => form.toLowerCase() !== past.toLowerCase(),
  );
  const gloss = typeof record.gloss === "string" ? cleanCell(record.gloss) : "";
  const family =
    typeof record.family === "string" ? cleanCell(record.family) : "";
  const rank =
    typeof record.rank === "number" && Number.isInteger(record.rank)
      ? record.rank
      : undefined;
  return {
    past,
    participle,
    ...(acceptPast.length > 0 ? { acceptPast } : {}),
    ...(gloss ? { gloss } : {}),
    ...(family ? { family } : {}),
    ...(rank !== undefined ? { rank } : {}),
  };
}

/**
 * The hand-curated irregular-verb table. Same cleanup as the frequency
 * dataset so a seeded `go` and a typed `Go` still meet on one key.
 */
export function parseVerbTable(text: string): VerbTableEntry[] {
  const entries: VerbTableEntry[] = [];
  const seen = new Set<string>();

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;

    const record = parsed as Record<string, unknown>;
    if (typeof record.text !== "string" || typeof record.translation !== "string") {
      continue;
    }

    const source = cleanCell(record.text);
    const translation = cleanCell(record.translation);
    const key = normalizeKey(source);
    const forms = asVerbForms(record);
    if (!source || !translation || !key || !forms) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    const family =
      typeof record.family === "string" ? cleanCell(record.family) : "";
    entries.push({
      text: source,
      key,
      translation,
      forms: {
        ...forms,
        gloss: translation,
        ...(family ? { family } : {}),
        rank: entries.length,
      },
    });
  }

  return entries;
}

/** The table as dictionary rows: infinitive + translation, nothing else. */
export function verbTableAsWords(
  text: string,
): { front: string; back: string }[] {
  return parseVerbTable(text).map((entry) => ({
    front: entry.text,
    back: entry.translation,
  }));
}
