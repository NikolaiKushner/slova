import type { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";

import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { activeModel, capabilitiesOf } from "@/lib/llm/models";

/**
 * Everything about the translation request except sending it.
 *
 * Kept pure so the two things most likely to break can be tested without a
 * network call or a key: that a word we need is actually in the prompt, and
 * that the request carries no parameter the chosen model would reject.
 */

/** One row of the import table, as the caller has it. */
export type TranslationRow = {
  text: string;
  /** Already known — from the lexicon or typed by hand. Never sent. */
  translation?: string | null;
};

/** What the model is asked to return per word. */
export type TranslationItem = {
  text: string;
  translation: string;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
};

const SOURCE = LANGUAGE_NAMES[STUDY_SOURCE_LANG];
const TARGET = LANGUAGE_NAMES[STUDY_TARGET_LANG];

/**
 * The model echoes `text` back rather than relying on array order, because the
 * caller matches results by key and a silently shifted array would attach the
 * wrong translation to the wrong word. `additionalProperties: false` plus a
 * full `required` list is a hard requirement of structured outputs, not style.
 */
export const TRANSLATION_SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The source word, copied back exactly as given.",
          },
          translation: {
            type: "string",
            description: `Its ${TARGET} translation.`,
          },
        },
        required: ["text", "translation"],
        additionalProperties: false,
      },
    },
  },
  required: ["translations"],
  additionalProperties: false,
} as const;

/** The brace depth at which `translations` items sit inside the response. */
export const TRANSLATION_ITEM_DEPTH = 2;

export const SYSTEM_PROMPT = [
  `You translate vocabulary for a language-learning app. The learner studies ${SOURCE}; you give the ${TARGET} side.`,
  "",
  "Rules:",
  `- Return the dictionary form of the ${TARGET} word, lowercase unless the ${SOURCE} word is a proper noun or an acronym.`,
  "- One translation per entry. If a word has several senses, pick the one the rest of the list points at.",
  "- The list is one lesson: if the other words are medical, legal or technical, translate this one in that field's sense, not the everyday one.",
  "- Translate a phrase as a phrase. Do not split it and do not answer with an explanation.",
  "- Never transliterate. If you genuinely cannot translate an entry, return an empty string for it rather than the source word spelled out in another alphabet.",
  "- Copy `text` back exactly as it was given, including case and punctuation.",
].join("\n");

/**
 * The words to ask about: the ones with nothing in the translation column.
 * Rows that already have a translation are the user's or the lexicon's answer
 * and are not up for revision — sending them would spend tokens to be told
 * what we know, and invite the model to overwrite a hand-typed correction.
 */
export function untranslated(rows: readonly TranslationRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const text = row.text.trim();
    if (!text) continue;
    if (row.translation?.trim()) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

export function buildUserMessage(words: readonly string[]): string {
  return [
    `Translate each ${SOURCE} word into ${TARGET}.`,
    "",
    ...words.map((word) => `- ${word}`),
  ].join("\n");
}

type BuildOptions = {
  model?: string;
  maxTokens?: number;
};

/**
 * A list of 40 words with an 8000-token ceiling leaves room for entries far
 * longer than any of them; the cap is there to bound a runaway, not to fit.
 */
const MAX_TOKENS = 8000;

/**
 * Note what is *not* here: no `thinking` (off by default on Haiku 4.5, and
 * dictionary pairs need none) and no `cache_control` (Haiku 4.5 will not cache
 * a prefix under 4096 tokens, and this system prompt is nowhere near that — a
 * breakpoint would silently do nothing).
 */
export function buildTranslationRequest(
  rows: readonly TranslationRow[],
  options: BuildOptions = {},
): MessageCreateParams {
  const model = options.model ?? activeModel();
  const words = untranslated(rows);

  const request: MessageCreateParams = {
    model,
    max_tokens: options.maxTokens ?? MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(words) }],
    output_config: {
      format: { type: "json_schema", schema: TRANSLATION_SCHEMA },
    },
  };

  if (capabilitiesOf(model).supportsEffort) {
    request.output_config = { ...request.output_config, effort: "low" };
  }

  return request;
}
