/**
 * Records every word in the shared base, once.
 *
 * Audio belongs beside the translation for the same reason: it is a property
 * of the word, not of the learner, so it is paid for once and heard by
 * everyone. A word that has a file plays the file; a word that does not falls
 * back to the browser's own voice, which can say anything but sounds like
 * whatever the device happens to have.
 *
 * Not batched — the Batch API answers that its supported endpoints are chat,
 * completions, embeddings, responses, videos, moderations and images. Speech
 * is not among them, so this is one request per word, several at a time.
 *
 * `tts-1` rather than the newer mini model: it is priced per character, which
 * for single words comes out cheaper and, more usefully, predictable. Resuming
 * is free — words that already have a URL are skipped, so an interrupted run
 * costs nothing to restart.
 */

import { config } from "dotenv";
import { put } from "@vercel/blob";

import { STUDY_SOURCE_LANG } from "@/lib/languages";
import { getPrisma } from "@/lib/prisma";

config({ path: [".env.local", ".env"] });

const MODEL = "tts-1";
const VOICE = "alloy";
const SOURCE = `openai:${MODEL}:${VOICE}`;

/** Requests in flight. Enough to be quick, few enough to stay under the limit. */
const CONCURRENCY = 8;

/** Reported every so often, so a long run shows it is alive. */
const PROGRESS_EVERY = 100;

type Pending = { id: string; key: string; text: string };

async function synthesise(text: string, apiKey: string): Promise<Buffer> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${detail.slice(0, 200)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set — run `vercel env pull`.");
    process.exit(1);
  }

  const prisma = getPrisma();
  const limit = Number.parseInt(process.argv[2] ?? "", 10);

  const pending: Pending[] = await prisma.lexeme.findMany({
    where: { lang: STUDY_SOURCE_LANG, audioUrl: null },
    orderBy: { key: "asc" },
    ...(Number.isFinite(limit) && limit > 0 ? { take: limit } : {}),
    select: { id: true, key: true, text: true },
  });

  if (pending.length === 0) {
    console.log("Everything already has audio.");
    return;
  }

  const characters = pending.reduce((sum, word) => sum + word.text.length, 0);
  console.log(
    `${pending.length} words, ${characters} characters — roughly $${(
      (characters / 1_000_000) *
      15
    ).toFixed(2)} at $15 per million.`,
  );

  let done = 0;
  let failed = 0;
  const started = Date.now();

  // A shared cursor rather than chunks: words differ in length, and a worker
  // that finishes early should take the next one rather than wait.
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const index = cursor++;
      if (index >= pending.length) return;
      const word = pending[index];

      try {
        const audio = await synthesise(word.text, apiKey);
        // Keyed by the normalised key, so re-running overwrites rather than
        // accumulating a second copy under a different name.
        const blob = await put(`audio/en/${word.key}.mp3`, audio, {
          access: "public",
          contentType: "audio/mpeg",
          addRandomSuffix: false,
          allowOverwrite: true,
        });

        await prisma.lexeme.update({
          where: { id: word.id },
          data: { audioUrl: blob.url, audioSource: SOURCE },
        });
        done++;
      } catch (error) {
        failed++;
        console.error(
          `  ${word.text}: ${error instanceof Error ? error.message : error}`,
        );
      }

      if ((done + failed) % PROGRESS_EVERY === 0) {
        const seconds = Math.round((Date.now() - started) / 1000);
        console.log(`  ${done + failed}/${pending.length} — ${seconds}s`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(
    `\nrecorded ${done}, failed ${failed}, in ${Math.round(
      (Date.now() - started) / 1000,
    )}s`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
