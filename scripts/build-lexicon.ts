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

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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

/**
 * Fewer words per request in `--enrich`, because the answer is three fields
 * instead of one. `outputCeiling` in `lib/llm/prompt.ts` stops scaling at 8000
 * tokens, and at a hundred words a chunk the enriched answer reaches it — a
 * truncated response loses whole rows rather than truncating one.
 */
const ENRICH_CHUNK = 50;

const NOTE =
  "This is a slice of a general frequency list, not a themed lesson: the words are unrelated, so translate each in its most common everyday sense. If an entry is a proper noun, an abbreviation, or not a translatable word, return an empty string for it.";

/**
 * The second pass, over what the first one refused.
 *
 * Nearly two thousand of the most frequent words came back empty, and almost
 * all of them are function words — articles, prepositions, auxiliaries. The
 * model was right that `the` has no Russian equivalent, and wrong to conclude
 * there is nothing to say about it: a learner meeting `the` in a pasted list
 * wants "определённый артикль", not a blank. The instruction has to allow a
 * gloss where a translation does not exist, while still refusing the brands
 * and abbreviations that a web-crawled frequency list is full of.
 */
/**
 * The third pass, over words that already have a translation.
 *
 * It re-asks for the translation as well, because the schema requires it and
 * there is one prompt rather than two — but the answer is thrown away and the
 * stored translation kept. That is deliberate: a re-translation would drift
 * silently against a file that has already been seeded, reviewed and shipped,
 * and enriching is not an occasion to revise meanings. The wasted output
 * tokens cost a fraction of a cent across the whole base.
 */
const ENRICH_NOTE =
  "These words already have translations; this pass is only for the transcription and part of speech. Give the IPA and the part of speech for each, and translate as usual — the translation is required by the schema but will be discarded, so do not labour over it. Return an empty string for a field you are not confident about rather than guessing.";

const MISSING_NOTE =
  "These are very common English words that an earlier pass declined to translate. Most are function words — articles, prepositions, auxiliaries, pronouns — which have no single dictionary equivalent in Russian. Translate them anyway: give the closest Russian equivalent, or a short gloss naming the grammatical role, for example 'the' as 'определённый артикль' or 'of' as 'предлог родительного падежа'. Return an empty string only for a proper noun, a brand name, or an abbreviation.";

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// tsx compiles this to CommonJS (package.json declares no module type),
// where top-level await is a syntax error. One wrapper, and it runs.
function resumeIdFromArgv(argv: readonly string[]): string | undefined {
  const index = argv.indexOf("--resume");
  if (index < 0) return undefined;
  const id = argv[index + 1];
  if (!id || id.startsWith("--")) {
    console.error("--resume needs a batch id (msgbatch_…).");
    process.exit(1);
  }
  return id;
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  // Fill the gaps rather than rebuild: a second pass over what came back empty
  // costs a fifth of the run and leaves everything already answered alone.
  const fillMissing = process.argv.includes("--missing");
  // Add the transcription and part of speech to lines that already have a
  // translation. Reads the output file rather than the word list, because the
  // population is what has been answered, not what was asked.
  const enrich = process.argv.includes("--enrich");
  // Collect an already-submitted batch instead of paying for another. The
  // poller is a local process, and an hour-long wait does not survive a closed
  // laptop; the batch on Anthropic's side does.
  const resumeId = resumeIdFromArgv(process.argv);

  if (resumeId && !fillMissing && !enrich) {
    console.error("--resume only applies to --missing or --enrich.");
    process.exit(1);
  }

  if (existsSync(OUTPUT) && !force && !fillMissing && !enrich) {
    console.error(
      `${OUTPUT} already exists. Rebuilding costs another batch run — pass --force to redo it, --missing to fill the gaps, or --enrich to add transcriptions and parts of speech.`,
    );
    process.exit(1);
  }

  if (enrich) {
    await enrichExisting(resumeId);
    return;
  }

  const all = readFileSync(INPUT, "utf8")
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);

  let words = all;
  if (fillMissing) {
    const answered = new Set(
      readFileSync(OUTPUT, "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => (JSON.parse(line) as { text: string }).text.toLowerCase()),
    );
    words = all.filter((word) => !answered.has(word.toLowerCase()));
    if (words.length === 0) {
      console.log("Nothing missing.");
      return;
    }
  }

  const groups = chunk(words, CHUNK);
  if (resumeId) {
    console.log(`resuming ${resumeId} (${words.length} words were in this pass)`);
  } else {
    console.log(`${words.length} words in ${groups.length} requests of ${CHUNK}`);
  }

  const { items, errored, succeeded } = await runBatch(
    groups,
    fillMissing ? MISSING_NOTE : NOTE,
    resumeId,
  );

  const lines = items
    // Empty translations are dropped here as well as in the parser: no reason
    // to ship a line whose only fate is to be skipped on load.
    .filter((item) => item?.text && item?.translation?.trim())
    .map((item) => JSON.stringify(datasetLine(item)));

  if (fillMissing) {
    const already = new Set(
      readFileSync(OUTPUT, "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => (JSON.parse(line) as { text: string }).text.toLowerCase()),
    );
    const fresh = lines.filter((line) => {
      const text = (JSON.parse(line) as { text: string }).text.toLowerCase();
      return !already.has(text);
    });
    if (fresh.length > 0) appendFileSync(OUTPUT, fresh.join("\n") + "\n");
    console.log(
      `\nwrote ${fresh.length} translations to ${OUTPUT}` +
        ` (${lines.length - fresh.length} already present, ${succeeded} chunks ok, ${errored} unusable)`,
    );
    return;
  }

  writeFileSync(OUTPUT, lines.join("\n") + "\n");

  console.log(
    `\nwrote ${lines.length} translations to ${OUTPUT} (${succeeded} chunks ok, ${errored} unusable)`,
  );
}

/** One dataset line. Empty fields are left out rather than written blank. */
function datasetLine(item: TranslationItem): Record<string, string> {
  const transcription = item.transcription?.trim();
  const partOfSpeech = item.partOfSpeech?.trim();
  return {
    text: item.text,
    translation: item.translation,
    ...(transcription ? { transcription } : {}),
    ...(partOfSpeech ? { partOfSpeech } : {}),
  };
}

type BatchOutcome = {
  items: TranslationItem[];
  errored: number;
  succeeded: number;
};

/**
 * Submit, poll, and collect. Shared by all three modes so the polling loop and
 * the "the model answered with something that is not JSON" path exist once.
 */
async function runBatch(
  groups: readonly (readonly string[])[],
  note: string,
  resumeId?: string,
): Promise<BatchOutcome> {
  const client = llm();

  let batch;
  if (resumeId) {
    batch = await client.messages.batches.retrieve(resumeId);
    console.log(`batch ${batch.id} is ${batch.processing_status}; polling every 60s`);
  } else {
    batch = await client.messages.batches.create({
      requests: groups.map((group, index) => ({
        custom_id: `chunk-${index}`,
        params: buildTranslationRequest(
          group.map((text) => ({ text })),
          { note },
        ),
      })),
    });
    console.log(`batch ${batch.id} submitted; polling every 60s`);
  }

  let status = batch;
  while (status.processing_status !== "ended") {
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    status = await client.messages.batches.retrieve(batch.id);
    const counts = status.request_counts;
    console.log(
      `  ${status.processing_status}: ${counts.succeeded} done, ${counts.processing} running, ${counts.errored} errored`,
    );
  }

  const items: TranslationItem[] = [];
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
      if (item?.text) items.push(item);
    }
  }

  return { items, errored, succeeded: status.request_counts.succeeded };
}

type DatasetRow = {
  text: string;
  translation: string;
  transcription?: string;
  partOfSpeech?: string;
};

/**
 * Fill in the transcription and part of speech on lines that already have a
 * translation, and rewrite the file in place.
 *
 * The stored translation is never replaced by what comes back — see
 * `ENRICH_NOTE`. The file is rewritten in its original order rather than
 * appended to, because these are edits to existing lines, and a diff that
 * reorders eight thousand of them is unreviewable.
 */
async function enrichExisting(resumeId?: string): Promise<void> {
  const rows: DatasetRow[] = readFileSync(OUTPUT, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as DatasetRow);

  const pending = rows.filter((row) => !row.transcription || !row.partOfSpeech);
  if (pending.length === 0) {
    console.log("Every line already has a transcription and a part of speech.");
    return;
  }

  const groups = chunk(
    pending.map((row) => row.text),
    ENRICH_CHUNK,
  );
  console.log(
    `${pending.length} of ${rows.length} lines need enriching — ${groups.length} requests of ${ENRICH_CHUNK}`,
  );

  const { items, errored, succeeded } = await runBatch(
    groups,
    ENRICH_NOTE,
    resumeId,
  );

  const answers = new Map<string, TranslationItem>();
  for (const item of items) answers.set(item.text.trim().toLowerCase(), item);

  let filledTranscription = 0;
  let filledPartOfSpeech = 0;

  for (const row of rows) {
    const answer = answers.get(row.text.trim().toLowerCase());
    if (!answer) continue;

    const transcription = answer.transcription?.trim();
    if (transcription && !row.transcription) {
      row.transcription = transcription;
      filledTranscription += 1;
    }

    const partOfSpeech = answer.partOfSpeech?.trim();
    if (partOfSpeech && !row.partOfSpeech) {
      row.partOfSpeech = partOfSpeech;
      filledPartOfSpeech += 1;
    }
  }

  writeFileSync(
    OUTPUT,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
  );

  console.log(
    `\nfilled ${filledTranscription} transcriptions and ${filledPartOfSpeech} parts of speech` +
      ` across ${rows.length} lines (${succeeded} chunks ok, ${errored} unusable)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
