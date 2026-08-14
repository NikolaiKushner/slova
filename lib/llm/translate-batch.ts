import { normalizeKey } from "@/lib/lexicon/key";
import { lookupBatch } from "@/lib/lexicon/lookup";
import { recordTranslations } from "@/lib/lexicon/write";
import { llm } from "@/lib/llm/client";
import { JsonArrayStream } from "@/lib/llm/json-array-stream";
import {
  buildTranslationRequest,
  TRANSLATION_ITEM_DEPTH,
  type TranslationItem,
} from "@/lib/llm/prompt";
import { tryReserveRequest } from "@/lib/llm/budget";
import { activeModel } from "@/lib/llm/models";
import { cleanCell, looksTransliterated, matchCase } from "@/lib/normalize";

/**
 * Translating a whole list, cheapest source first.
 *
 * The shape is a generator because the two sources answer on completely
 * different timescales: the shared base answers in one round trip for the
 * entire list, and the model answers over several seconds. Waiting for the
 * slow one before showing the fast one would throw away the only part of this
 * that is instant — and after seeding, the fast one is most of the list.
 */

export type TranslatedRow = {
  text: string;
  translation: string;
  from: "lexicon" | "llm";
};

export type BatchUsage = {
  lexiconHits: number;
  llmMisses: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

export type BatchOutcome = {
  usage: BatchUsage;
};

/**
 * Yields a row as soon as it has one. Hits come first, all of them, before any
 * network call is made; then misses as the model produces them.
 *
 * The caller gets the usage totals through `outcome`, which is filled in by
 * the time the generator finishes — the numbers are not known until then, and
 * a generator cannot return them alongside its values.
 */
export async function* translateBatch(
  texts: readonly string[],
  outcome: BatchOutcome,
  options: { userId: string },
): AsyncGenerator<TranslatedRow> {
  const usage = outcome.usage;

  const { hits, misses } = await lookupBatch(texts);

  for (const text of texts) {
    const hit = hits.get(normalizeKey(text));
    if (!hit) continue;
    usage.lexiconHits += 1;
    yield { text, translation: hit.translation, from: "lexicon" };
  }

  if (misses.length === 0) return;
  usage.llmMisses = misses.length;

  await tryReserveRequest(options.userId);

  const missKeys = new Set(misses.map((text) => normalizeKey(text)));
  const model = activeModel();
  const request = buildTranslationRequest(misses.map((text) => ({ text })));
  const stream = llm().messages.stream(request);

  const scanner = new JsonArrayStream<TranslationItem>({
    depth: TRANSLATION_ITEM_DEPTH,
  });
  const produced: { text: string; translation: string }[] = [];

  for await (const event of stream) {
    if (
      event.type !== "content_block_delta" ||
      event.delta.type !== "text_delta"
    ) {
      continue;
    }

    for (const item of scanner.push(event.delta.text)) {
      const row = clean(item);
      if (!row) continue;
      if (!missKeys.has(normalizeKey(row.text))) continue;
      produced.push(row);
      yield { ...row, from: "llm" };
    }
  }

  const final = await stream.finalMessage();
  usage.requests += 1;
  usage.inputTokens += final.usage.input_tokens;
  usage.outputTokens += final.usage.output_tokens;

  // Written after the stream rather than per row: the point of the base is the
  // next list, not this one, and one batched write beats N round trips while
  // somebody is watching the table fill in.
  if (produced.length > 0) {
    await recordTranslations(
      produced.map((row) => ({ ...row, source: "llm" as const, model })),
      { userId: options.userId },
    );
  }
}

/**
 * The same cleanup the import path applies to pasted text, over the model's
 * output. On a good answer it changes nothing; when it does change something,
 * that is a signal the prompt needs work, not the normaliser.
 *
 * Two answers are dropped rather than cleaned: an empty one, which is the
 * model saying it could not translate this word, and one written in the wrong
 * script, which is how a wrong-language answer shows up.
 */
function clean(item: TranslationItem): { text: string; translation: string } | null {
  const text = cleanCell(item?.text ?? "");
  const translation = matchCase(text, cleanCell(item?.translation ?? ""));
  if (!text || !translation) return null;
  if (looksTransliterated(translation)) return null;
  return { text, translation };
}

export function emptyUsage(): BatchUsage {
  return {
    lexiconHits: 0,
    llmMisses: 0,
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}
