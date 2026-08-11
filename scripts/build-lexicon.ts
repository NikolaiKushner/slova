/**
 * Builds `content/lexicon/en-ru-frequency.jsonl` from the frequency word list,
 * through the Anthropic Batch API.
 *
 * Batch rather than the ordinary endpoint for one reason: it is half price,
 * and nothing here is interactive. It is the wrong tool for translating a list
 * a person is looking at — the answer can take up to 24 hours — and exactly the
 * right one for a job run once whose output ships in the repository.
 *
 * Same model and same prompt as the runtime, so a seeded translation and one
 * the app fetches later read the same. `content/lexicon/SOURCE.md` says why
 * that matters.
 *
 * Idempotent in the only sense that counts: it writes a file. Re-running costs
 * another batch, so it also refuses to start when the output already exists
 * unless told otherwise.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";

import { llm } from "@/lib/llm/client";
import { buildTranslationRequest, type TranslationItem } from "@/lib/llm/prompt";

// Before anything asks for a key: both modules read the environment when
// called, not when imported, so loading them above this line is safe.
config({ path: [".env.local", ".env"] });

const INPUT = "content/lexicon/en-frequency.txt";
const OUTPUT = "content/lexicon/en-ru-frequency.jsonl";

/**
 * Words per request. Bigger is cheaper — the ~250-token system prompt is paid
 * once per request, not once per word — and the ceiling is the output: 100
 * words at the measured ~18 tokens each is ~1,800, comfortably inside 8,000.
 */
const CHUNK = 100;

const NOTE =
  "This is a slice of a general frequency list, not a themed lesson: the words are unrelated, so translate each in its most common everyday sense. If an entry is a proper noun, an abbreviation, or not a translatable word, return an empty string for it.";

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// tsx compiles this to CommonJS (package.json declares no module type),
// where top-level await is a syntax error. One wrapper, and it runs.
async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  if (existsSync(OUTPUT) && !force) {
    console.error(
      `${OUTPUT} already exists. Rebuilding costs another batch run — pass --force if that is what you want.`,
    );
    process.exit(1);
  }

  const words = readFileSync(INPUT, "utf8")
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);

  const batches = chunk(words, CHUNK);
  console.log(`${words.length} words in ${batches.length} requests of ${CHUNK}`);

  const client = llm();

  const batch = await client.messages.batches.create({
    requests: batches.map((group, index) => ({
      custom_id: `chunk-${index}`,
      params: buildTranslationRequest(
        group.map((text) => ({ text })),
        { note: NOTE },
      ),
    })),
  });

  console.log(`batch ${batch.id} submitted; polling every 60s`);

  let status = batch;
  while (status.processing_status !== "ended") {
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    status = await client.messages.batches.retrieve(batch.id);
    const counts = status.request_counts;
    console.log(
      `  ${status.processing_status}: ${counts.succeeded} done, ${counts.processing} running, ${counts.errored} errored`,
    );
  }

  const lines: string[] = [];
  let errored = 0;

  for await (const result of await client.messages.batches.results(batch.id)) {
    if (result.result.type !== "succeeded") {
      errored++;
      console.error(`  ${result.custom_id}: ${result.result.type}`);
      continue;
    }

    const text = result.result.message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    let payload: { translations?: TranslationItem[] };
    try {
      payload = JSON.parse(text);
    } catch {
      errored++;
      console.error(`  ${result.custom_id}: response was not JSON`);
      continue;
    }

    for (const item of payload.translations ?? []) {
      // Empty translations are dropped here as well as in the parser: no reason
      // to ship a line whose only fate is to be skipped on load.
      if (!item?.text || !item?.translation?.trim()) continue;
      lines.push(JSON.stringify({ text: item.text, translation: item.translation }));
    }
  }

  writeFileSync(OUTPUT, lines.join("\n") + "\n");

  const usage = status.request_counts;
  console.log(
    `\nwrote ${lines.length} translations to ${OUTPUT} (${usage.succeeded} chunks ok, ${errored} unusable)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
