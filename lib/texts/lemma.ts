import { readFileSync } from "node:fs";

import winkNLP, { type ItsFunction, type Tokens } from "wink-nlp";
import model from "wink-eng-lite-web-model";

import { normalizeKey } from "@/lib/lexicon/key";
import { parseVerbTable } from "@/lib/lexicon/forms";
import type { Lemmatizer, TokenSpan } from "@/lib/texts/tokenize";

/**
 * Dictionary form for every token of a paragraph — docs/plans/reader.md §5.
 * Server-side only: the model is 3.8 MB on disk and must never reach the
 * client bundle.
 */

const VERB_TABLE = "content/lexicon/en-irregular-verbs.jsonl";

let engine: ReturnType<typeof winkNLP> | null = null;
let irregular: Map<string, string> | null = null;

function nlp() {
  engine ??= winkNLP(model);
  return engine;
}

/** `went → go` from the curated table, which outranks the library for verbs. */
function irregularForms(): Map<string, string> {
  if (irregular) return irregular;

  const map = new Map<string, string>();
  for (const entry of parseVerbTable(readFileSync(VERB_TABLE, "utf8"))) {
    const { past, participle, acceptPast = [] } = entry.forms;
    for (const form of [past, participle, ...acceptPast]) {
      const key = normalizeKey(form);
      if (key && key !== entry.key) map.set(key, entry.key);
    }
  }
  irregular = map;
  return map;
}

type WinkToken = { lemma: string; pos: string };

/** wink's `its` helpers are typed for an internal shape `ItsFunction` lacks. */
const column = (tokens: Tokens, its: unknown): string[] =>
  tokens.out(its as ItsFunction<string>) as string[];

/**
 * Wink splits `doesn't` in two and reports no offsets, so its values are walked
 * back onto the text in order; only an exact span match lends its lemma.
 */
function winkTokens(text: string): Map<string, WinkToken> {
  const { its } = nlp();
  const tokens = nlp().readDoc(text).tokens();
  const values = column(tokens, its.value);
  const lemmas = column(tokens, its.lemma);
  const parts = column(tokens, its.pos);

  const found = new Map<string, WinkToken>();
  let cursor = 0;
  for (const [index, value] of values.entries()) {
    const start = text.indexOf(value, cursor);
    if (start < 0) continue;
    cursor = start + value.length;
    found.set(`${start}:${cursor}`, { lemma: lemmas[index], pos: parts[index] });
  }

  return found;
}

export const lemmatize: Lemmatizer = (
  text: string,
  spans: readonly TokenSpan[],
) => {
  if (spans.length === 0) return [];

  const table = irregularForms();
  const tokens = winkTokens(text);

  return spans.map((span) => {
    const key = normalizeKey(text.slice(span.start, span.end));
    const token = tokens.get(`${span.start}:${span.end}`);

    // The curated table is a verb table; applying it to a noun would turn
    // "a saw" into "see".
    if (token?.pos === "VERB" || token?.pos === "AUX" || !token) {
      const curated = table.get(key);
      if (curated) return curated;
    }
    return token ? normalizeKey(token.lemma) || key : key;
  });
};
