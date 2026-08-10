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

export const LANG_OPTIONS: { code: LangCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Russian" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "pl", label: "Polish" },
];

/** Used when a list does not say what it is translating between. */
export const DEFAULT_SOURCE_LANG: LangCode = "en";
export const DEFAULT_TARGET_LANG: LangCode = "ru";

export const langCodeSchema = z.enum(LANG_CODES);

/** Narrow a value read from the database, which stores plain strings. */
export function toLangCode(value: string, fallback: LangCode): LangCode {
  return (LANG_CODES as readonly string[]).includes(value)
    ? (value as LangCode)
    : fallback;
}
