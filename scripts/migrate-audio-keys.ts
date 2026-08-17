/**
 * Copies phrase recordings off space-bearing object keys onto the underscore
 * names `audioObjectKey` now produces, then points the lexeme rows at the new
 * URLs.
 *
 * Twenty-seven files were minted before the naming rule: 26 slow, 1 normal.
 * Re-running is safe — a key that already matches is skipped.
 *
 *   npx tsx scripts/migrate-audio-keys.ts
 *   npx tsx scripts/migrate-audio-keys.ts --dry-run
 */

import { config } from "dotenv";

import { createR2Storage } from "@/lib/audio/r2";
import { STUDY_SOURCE_LANG } from "@/lib/languages";
import {
  audioObjectKey,
  legacyAudioObjectKey,
  type AudioVariant,
} from "@/lib/lexicon/key";
import { getPrisma } from "@/lib/prisma";

config({ path: [".env.local", ".env"] });

const VARIANTS: AudioVariant[] = ["normal", "slow"];

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();
  const phrases = await prisma.lexeme.findMany({
    where: { lang: STUDY_SOURCE_LANG, key: { contains: " " } },
    select: { id: true, key: true, audioUrl: true, audioSlowUrl: true },
  });

  const pending = phrases.filter((row) => row.audioUrl || row.audioSlowUrl);
  console.log(
    `${phrases.length} phrase lexemes, ${pending.length} with a recording.`,
  );
  if (pending.length === 0) return;

  const r2 = dryRun ? null : createR2Storage();
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pending) {
    for (const variant of VARIANTS) {
      const from = legacyAudioObjectKey(row.key, variant);
      const to = audioObjectKey(row.key, variant);
      if (!from || !to || from === to) {
        skipped += 1;
        continue;
      }

      const field = variant === "slow" ? "audioSlowUrl" : "audioUrl";
      const current = row[field];
      if (!current) {
        skipped += 1;
        continue;
      }
      if (current.endsWith(`/${to}`) || current.endsWith(`/${encodeURI(to)}`)) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`  would copy ${from} → ${to}`);
        copied += 1;
        continue;
      }

      try {
        const url = await r2!.copyAudio(from, to);
        await prisma.lexeme.update({
          where: { id: row.id },
          data: { [field]: url },
        });
        copied += 1;
        console.log(`  ${from} → ${to}`);
      } catch (error) {
        failed += 1;
        console.error(
          `  ${from}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  console.log(
    `\n${dryRun ? "would copy" : "copied"} ${copied}, skipped ${skipped}, failed ${failed}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
