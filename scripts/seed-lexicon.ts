/**
 * Loads `content/lexicon/en-ru-frequency.jsonl` into the shared base.
 *
 * Run by hand against production after a deploy, not from the build: pushing
 * ten thousand rows on every deploy would be a slow way to achieve nothing.
 *
 * Re-running is safe and is the intended way to apply a rebuilt dataset. Rows
 * this script owns — `source="seed"` — are replaced wholesale; everything the
 * lexicon has earned since (`llm` from a real miss, `import` from someone
 * typing) is left exactly alone. That asymmetry is the reason `source` exists
 * on the lexeme as well as on the translation.
 */

import { readFileSync } from "node:fs";
import { config } from "dotenv";

import { kindOf, parseDataset, type DatasetEntry } from "@/lib/lexicon/dataset";
import { parseVerbTable } from "@/lib/lexicon/forms";
import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

config({ path: [".env.local", ".env"] });

const INPUT = "content/lexicon/en-ru-frequency.jsonl";
const VERBS = "content/lexicon/en-irregular-verbs.jsonl";

/** Rows per round trip. Large enough to be few trips, small enough to not time out. */
const CHUNK = 500;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Shared with loadChunk below; assigned once main() has loaded the environment.
let prisma: ReturnType<typeof getPrisma>;
let lexemesTouched = 0;
let lexemesEnriched = 0;
let translationsWritten = 0;

// tsx compiles this to CommonJS, where top-level await is a syntax error.
async function main(): Promise<void> {
  const { entries, warnings, dropped } = parseDataset(readFileSync(INPUT, "utf8"));

  console.log(`${entries.length} usable entries; ${warnings.length} lines skipped`);
  for (const warning of warnings.slice(0, 10)) {
    console.log(`  line ${warning.line}: ${warning.reason}`);
  }
  if (warnings.length > 10) console.log(`  … and ${warnings.length - 10} more`);

  const withTranscription = entries.filter((e) => e.transcription).length;
  const withPartOfSpeech = entries.filter((e) => e.partOfSpeech).length;
  console.log(
    `enrichment: ${withTranscription} transcriptions, ${withPartOfSpeech} parts of speech` +
      ` (dropped ${dropped.transcription} and ${dropped.partOfSpeech} as unusable)`,
  );

  if (entries.length === 0) {
    console.error("Nothing to seed.");
    process.exit(1);
  }

  prisma = getPrisma();

  for (const [index, group] of chunk(entries, CHUNK).entries()) {
    await loadChunk(group);
    process.stdout.write(
      `\r  ${Math.min((index + 1) * CHUNK, entries.length)}/${entries.length}`,
    );
  }
  process.stdout.write("\n");

  const seeded = await prisma.lexeme.count({ where: { source: "seed" } });
  console.log(
    `\nlexemes touched: ${lexemesTouched}, enriched: ${lexemesEnriched}, translations written: ${translationsWritten}`,
  );
  console.log(`Lexeme rows with source="seed": ${seeded}`);

  await seedVerbForms();
}

/**
 * Transcription and part of speech onto rows that already exist.
 *
 * `createMany({ skipDuplicates: true })` above is the right tool for the first
 * run and does nothing on the eight thousand rows a second run finds already
 * there — so enrichment needs its own statement. One `UPDATE ... FROM (VALUES)`
 * per chunk rather than a query per word: this is a serverless database, and
 * eight thousand sequential round trips is the difference between a minute and
 * an hour.
 *
 * Two guards are load-bearing. `COALESCE` means a file that carries no
 * transcription for a word leaves the stored one alone, so a partial dataset
 * enriches rather than erases. `source = 'seed'` keeps the script inside what
 * it owns — a lexeme a real miss created is `llm`, and `SOURCE.md` promises
 * those are left exactly alone.
 */
async function enrichChunk(group: readonly DatasetEntry[]): Promise<number> {
  const enriched = group.filter(
    (entry) => entry.transcription || entry.partOfSpeech,
  );
  if (enriched.length === 0) return 0;

  const values: string[] = [];
  const params: (string | null)[] = [STUDY_SOURCE_LANG];
  for (const entry of enriched) {
    const at = params.length;
    values.push(`($${at + 1}::text, $${at + 2}::text, $${at + 3}::text)`);
    params.push(
      entry.key,
      entry.transcription ?? null,
      entry.partOfSpeech ?? null,
    );
  }

  return prisma.$executeRawUnsafe(
    `UPDATE "Lexeme" AS l
        SET "transcription" = COALESCE(v.transcription, l."transcription"),
            "partOfSpeech"  = COALESCE(v.pos, l."partOfSpeech"),
            "updatedAt"     = NOW()
       FROM (VALUES ${values.join(", ")}) AS v(key, transcription, pos)
      WHERE l."lang" = $1 AND l."key" = v.key AND l."source" = 'seed'`,
    ...params,
  );
}

/**
 * Irregular triples onto matching lexemes. Most of the table is already in
 * the frequency seed; this writes `forms` onto those rows and only creates a
 * lexeme when the verb was not in the list at all.
 */
async function seedVerbForms(): Promise<void> {
  const table = parseVerbTable(readFileSync(VERBS, "utf8"));
  if (table.length === 0) {
    console.log("No irregular verbs to seed.");
    return;
  }

  await prisma.lexeme.createMany({
    data: table.map((entry) => ({
      lang: STUDY_SOURCE_LANG,
      key: entry.key,
      text: entry.text,
      kind: "word" as const,
      source: "seed",
      forms: entry.forms as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });

  let formsWritten = 0;
  for (const entry of table) {
    const written = await prisma.lexeme.updateMany({
      where: { lang: STUDY_SOURCE_LANG, key: entry.key },
      data: { forms: entry.forms as unknown as Prisma.InputJsonValue },
    });
    formsWritten += written.count;
  }

  const lexemes = await prisma.lexeme.findMany({
    where: {
      lang: STUDY_SOURCE_LANG,
      key: { in: table.map((entry) => entry.key) },
    },
    select: {
      id: true,
      key: true,
      translations: {
        where: { targetLang: STUDY_TARGET_LANG },
        select: { id: true },
        take: 1,
      },
    },
  });
  const translationByKey = new Map(table.map((entry) => [entry.key, entry]));
  const missing = lexemes.filter((row) => row.translations.length === 0);

  if (missing.length > 0) {
    await prisma.lexemeTranslation.createMany({
      data: missing.flatMap((row) => {
        const entry = translationByKey.get(row.key);
        if (!entry) return [];
        return [
          {
            lexemeId: row.id,
            targetLang: STUDY_TARGET_LANG,
            text: entry.translation,
            source: "seed",
            confirmations: 1,
            isGlobal: true,
            isPrimary: true,
          },
        ];
      }),
      skipDuplicates: true,
    });
  }

  const withForms = await prisma.lexeme.count({
    where: { lang: STUDY_SOURCE_LANG, NOT: { forms: { equals: Prisma.DbNull } } },
  });
  console.log(
    `irregular verbs: ${table.length} in the table, ${formsWritten} rows updated, ${withForms} lexemes now carry forms` +
      (missing.length > 0 ? `, ${missing.length} translations added` : ""),
  );
}

async function loadChunk(group: readonly DatasetEntry[]): Promise<void> {
  await prisma.lexeme.createMany({
    data: group.map((entry) => ({
      lang: STUDY_SOURCE_LANG,
      key: entry.key,
      text: entry.text,
      kind: kindOf(entry.text),
      source: "seed",
      ...(entry.transcription ? { transcription: entry.transcription } : {}),
      ...(entry.partOfSpeech ? { partOfSpeech: entry.partOfSpeech } : {}),
    })),
    skipDuplicates: true,
  });

  lexemesEnriched += await enrichChunk(group);

  const lexemes = await prisma.lexeme.findMany({
    where: { lang: STUDY_SOURCE_LANG, key: { in: group.map((e) => e.key) } },
    select: { id: true, key: true },
  });
  const idByKey = new Map(lexemes.map((row) => [row.key, row.id] as const));
  const ids = [...idByKey.values()];
  lexemesTouched += ids.length;

  // Replace rather than upsert: a rebuilt dataset can change a translation's
  // text, and an upsert keyed on the text would leave the old one behind as a
  // second global answer for the same word.
  await prisma.lexemeTranslation.deleteMany({
    where: { lexemeId: { in: ids }, targetLang: STUDY_TARGET_LANG, source: "seed" },
  });

  // A hand-curated translation outranks a seeded one, so where one exists the
  // seed goes in as global but not primary.
  const curated = await prisma.lexemeTranslation.findMany({
    where: {
      lexemeId: { in: ids },
      targetLang: STUDY_TARGET_LANG,
      source: "curated",
    },
    select: { lexemeId: true },
  });
  const outranked = new Set(curated.map((row) => row.lexemeId));

  const rows = group.flatMap((entry) => {
    const lexemeId = idByKey.get(entry.key);
    if (!lexemeId) return [];
    return [
      {
        lexemeId,
        targetLang: STUDY_TARGET_LANG,
        text: entry.translation,
        source: "seed",
        // Seeding is one source, not two, but it is a trusted one: global from
        // the first day, unlike a translation someone typed.
        confirmations: 1,
        isGlobal: true,
        isPrimary: !outranked.has(lexemeId),
      },
    ];
  });

  const written = await prisma.lexemeTranslation.createMany({
    data: rows,
    skipDuplicates: true,
  });
  translationsWritten += written.count;

  // Seed outranks what the model guessed and what a user typed, so anything
  // weaker stops being the primary answer for these words.
  await prisma.lexemeTranslation.updateMany({
    where: {
      lexemeId: { in: ids.filter((id) => !outranked.has(id)) },
      targetLang: STUDY_TARGET_LANG,
      source: { in: ["llm", "import"] },
      isPrimary: true,
    },
    data: { isPrimary: false },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
