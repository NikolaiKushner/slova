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
 *
 * Stored in Cloudflare R2 rather than Vercel Blob. Blob suspended itself at
 * six thousand files — not for space, fifty megabytes is nothing, but because
 * it is a billed product and the free allowance ran out mid-run. R2 gives ten
 * gigabytes and, more to the point, charges nothing for serving them, which is
 * the recurring cost that matters for audio.
 */

import { config } from "dotenv";

import {
  NORMAL_AUDIO_PROFILE,
  SLOW_AUDIO_PROFILE,
} from "@/lib/audio/profile";
import { createR2Storage } from "@/lib/audio/r2";
import { synthesizeSpeech } from "@/lib/audio/tts";
import { STUDY_SOURCE_LANG } from "@/lib/languages";
import { audioObjectKey } from "@/lib/lexicon/key";
import { getPrisma } from "@/lib/prisma";

config({ path: [".env.local", ".env"] });

/** Requests in flight. Enough to be quick, few enough to stay under the limit. */
const CONCURRENCY = 8;

/** Reported every so often, so a long run shows it is alive. */
const PROGRESS_EVERY = 100;

type Pending = { id: string; key: string; text: string };

function parseArgs(argv: string[]): {
  slow: boolean;
  dryRun: boolean;
  limit?: number;
} {
  const slow = argv.includes("--slow");
  const dryRun = argv.includes("--dry-run");
  const positional = argv.filter((arg) => !arg.startsWith("--"));

  if (argv.some((arg) => arg.startsWith("--") && arg !== "--slow" && arg !== "--dry-run")) {
    throw new Error("Usage: build-audio.ts [--slow [--dry-run]] [limit]");
  }
  if (positional.length > 1) {
    throw new Error("Only one numeric limit is allowed.");
  }
  if (dryRun && !slow) {
    throw new Error("--dry-run is only available with the explicit --slow mode.");
  }

  if (positional.length === 0) return { slow, dryRun };
  const limit = Number(positional[0]);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("The limit must be a positive integer.");
  }
  return { slow, dryRun, limit };
}

async function main(): Promise<void> {
  const { slow, dryRun, limit } = parseArgs(process.argv.slice(2));
  const prisma = getPrisma();
  const profile = slow ? SLOW_AUDIO_PROFILE : NORMAL_AUDIO_PROFILE;

  const pending: Pending[] = await prisma.lexeme.findMany({
    where: slow
      ? { lang: STUDY_SOURCE_LANG, audioSlowUrl: null }
      : { lang: STUDY_SOURCE_LANG, audioUrl: null },
    orderBy: { key: "asc" },
    ...(limit ? { take: limit } : {}),
    select: { id: true, key: true, text: true },
  });

  if (pending.length === 0) {
    console.log(`Everything already has ${slow ? "slow " : ""}audio.`);
    return;
  }

  const characters = pending.reduce((sum, word) => sum + word.text.length, 0);
  console.log(
    `${pending.length} words, ${characters} characters — roughly $${(
      (characters / 1_000_000) *
      15
    ).toFixed(2)} at $15 per million.`,
  );
  if (dryRun) {
    console.log("Dry run: no speech was synthesized, uploaded, or written.");
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  let r2: ReturnType<typeof createR2Storage>;
  try {
    // Validate storage before the first paid synthesis. Without a public URL
    // files would be uploaded but unreachable, which already happened once.
    r2 = createR2Storage();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

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
        const audio = await synthesizeSpeech(word.text, { apiKey, profile });
        // Named by the normalised key, so a re-run overwrites rather than
        // leaving a second copy under a different name.
        const path = audioObjectKey(word.key, slow ? "slow" : "normal");
        if (!path) {
          failed += 1;
          console.error(`skip unsafe key ${word.id} ${word.key}`);
          continue;
        }
        const audioUrl = await r2.putAudio(path, audio);

        await prisma.lexeme.update({
          where: { id: word.id },
          data: slow
            ? { audioSlowUrl: audioUrl }
            : { audioUrl, audioSource: NORMAL_AUDIO_PROFILE.source },
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
