import { z } from "zod";

export const LANG_CODES = [
  "en",
  "ru",
  "de",
  "es",
  "fr",
  "it",
  "pt",
  "pl",
] as const;

export type LangCode = (typeof LANG_CODES)[number];

/**
 * Slova teaches one direction for now: English words, Russian translations.
 * LANG_CODES stays wider than this because /api/translate still accepts any
 * supported pair — only the UI is pinned.
 */
export const STUDY_SOURCE_LANG: LangCode = "en";
export const STUDY_TARGET_LANG: LangCode = "ru";

export const langCodeSchema = z.enum(LANG_CODES);

/** Narrow a value read from the database, which stores plain strings. */
export function toLangCode(value: string, fallback: LangCode): LangCode {
  return (LANG_CODES as readonly string[]).includes(value)
    ? (value as LangCode)
    : fallback;
}
