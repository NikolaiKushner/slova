import { normalizeKey } from "@/lib/lexicon/key";
import { lookupBatch } from "@/lib/lexicon/lookup";
import type { IncomingTranslation } from "@/lib/lexicon/write";
import { llm } from "@/lib/llm/client";
import { JsonArrayStream } from "@/lib/llm/json-array-stream";
import {
  buildTranslationRequest,
  TRANSLATION_ITEM_DEPTH,
  type TranslationItem,
} from "@/lib/llm/prompt";
import {
  conservativeInputTokenReservation,
  reconcileLlmUsage,
  reserveLlmUsage,
} from "@/lib/llm/budget";
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
  cacheWrites: IncomingTranslation[];
  lookupLatencyMs: number;
  modelLatencyMs: number;
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

  const lookupStartedAt = performance.now();
  const { hits, misses } = await lookupBatch(texts);
  outcome.lookupLatencyMs = Math.round(performance.now() - lookupStartedAt);

  for (const text of texts) {
    const hit = hits.get(normalizeKey(text));
    if (!hit) continue;
    usage.lexiconHits += 1;
    yield { text, translation: hit.translation, from: "lexicon" };
  }

  if (misses.length === 0) return;
  usage.llmMisses = misses.length;

  const missKeys = new Set(misses.map((text) => normalizeKey(text)));
  const model = activeModel();
  const modelStartedAt = performance.now();
  const request = buildTranslationRequest(misses.map((text) => ({ text })));
  const client = llm();
  const counted = await client.messages.countTokens({
    model: request.model,
    messages: request.messages,
    system: request.system,
    output_config: request.output_config,
  });
  const reservation = {
    inputTokens: conservativeInputTokenReservation(
      request,
      counted.input_tokens,
    ),
    outputTokens: request.max_tokens,
  };
  await reserveLlmUsage(options.userId, reservation);

  const stream = client.messages.stream(request);

  const scanner = new JsonArrayStream<TranslationItem>({
    depth: TRANSLATION_ITEM_DEPTH,
  });
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
      outcome.cacheWrites.push({ ...row, source: "llm", model });
      yield { ...row, from: "llm" };
    }
  }

  const final = await stream.finalMessage();
  usage.requests += 1;
  usage.inputTokens += final.usage.input_tokens;
  usage.outputTokens += final.usage.output_tokens;
  await reconcileLlmUsage(options.userId, reservation, {
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  });
  outcome.modelLatencyMs = Math.round(performance.now() - modelStartedAt);
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

export function emptyBatchOutcome(): BatchOutcome {
  return {
    usage: emptyUsage(),
    cacheWrites: [],
    lookupLatencyMs: 0,
    modelLatencyMs: 0,
  };
}
