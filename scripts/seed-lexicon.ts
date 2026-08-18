/**
 * Loads the shared base from the seed files in `content/lexicon/`.
 *
 * Run by hand against production after a deploy, not from the build: pushing
 * ten thousand rows on every deploy would be a slow way to achieve nothing.
 *
 * Re-running is safe and is the intended way to apply a rebuilt dataset. Rows
 * this script owns — `source="seed"` — are replaced wholesale; everything the
 * lexicon has earned since (`llm` from a real miss, `import` from someone
 * typing) is left exactly alone. That asymmetry is the reason `source` exists
 * on the lexeme as well as on the translation.
 *
 * Default loads words, phrases and irregular verbs. A phrases-only re-run:
 * `npm run db:seed-lexicon -- --kind=phrase`.
 */

import { readFileSync } from "node:fs";
import { config } from "dotenv";

import { kindOf, parseDataset, type DatasetEntry } from "@/lib/lexicon/dataset";
import { parseVerbTable } from "@/lib/lexicon/forms";
import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

config({ path: [".env.local", ".env"] });

const DATASETS = {
  word: "content/lexicon/en-ru-frequency.jsonl",
  phrase: "content/lexicon/en-ru-phrases.jsonl",
} as const;

const VERBS = "content/lexicon/en-irregular-verbs.jsonl";

type SeedKind = keyof typeof DATASETS;

function parseArgs(argv: string[]): { kinds: SeedKind[]; verbs: boolean } {
  const kindArg = argv.find((arg) => arg.startsWith("--kind="));
  if (!kindArg) return { kinds: ["word", "phrase"], verbs: true };

  const value = kindArg.slice("--kind=".length);
  if (value === "word") return { kinds: ["word"], verbs: true };
  if (value === "phrase") return { kinds: ["phrase"], verbs: false };
  throw new Error("Usage: seed-lexicon.ts [--kind=word|phrase]");
}

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
  const { kinds, verbs } = parseArgs(process.argv.slice(2));
  prisma = getPrisma();

  for (const kind of kinds) {
    await seedDataset(DATASETS[kind], kind);
  }

  if (verbs) await seedVerbForms();
}

async function seedDataset(path: string, kind: SeedKind): Promise<void> {
  const { entries, warnings, dropped } = parseDataset(readFileSync(path, "utf8"));

  console.log(
    `${path}: ${entries.length} usable entries; ${warnings.length} lines skipped`,
  );
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
    console.error(`Nothing to seed from ${path}.`);
    if (kind === "word") process.exit(1);
    return;
  }

  lexemesTouched = 0;
  lexemesEnriched = 0;
  translationsWritten = 0;

  for (const [index, group] of chunk(entries, CHUNK).entries()) {
    await loadChunk(group);
    process.stdout.write(
      `\r  ${Math.min((index + 1) * CHUNK, entries.length)}/${entries.length}`,
    );
  }
  process.stdout.write("\n");

  const seeded = await prisma.lexeme.count({
    where: { source: "seed", kind: kind === "phrase" ? "phrase" : "word" },
  });
  console.log(
    `\nlexemes touched: ${lexemesTouched}, enriched: ${lexemesEnriched}, translations written: ${translationsWritten}`,
  );
  console.log(`Lexeme rows with source="seed" kind="${kind === "phrase" ? "phrase" : "word"}": ${seeded}`);
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
    const seeded = await prisma.lexemeTranslation.findMany({
      where: {
        lexemeId: { in: missing.map((row) => row.id) },
        targetLang: STUDY_TARGET_LANG,
        source: "seed",
      },
      select: { id: true },
    });
    await prisma.lexemeTranslationConfirmation.createMany({
      data: seeded.map((row) => ({
        translationId: row.id,
        userId: "__seed_lexicon__",
      })),
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
      isGlobal: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, lexemeId: true },
  });
  const curatedPrimaryByLexeme = new Map<string, string>();
  for (const row of curated) {
    if (!curatedPrimaryByLexeme.has(row.lexemeId)) {
      curatedPrimaryByLexeme.set(row.lexemeId, row.id);
    }
  }
  const outranked = new Set(curatedPrimaryByLexeme.keys());

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

  // Clear the old selection before inserting the trusted replacement. The
  // partial unique index means the invariant also holds halfway through this
  // maintenance operation, not only after the script finishes.
  await prisma.lexemeTranslation.updateMany({
    where: {
      lexemeId: { in: ids },
      targetLang: STUDY_TARGET_LANG,
      isPrimary: true,
    },
    data: { isPrimary: false },
  });

  const written = await prisma.lexemeTranslation.createMany({
    data: rows,
    skipDuplicates: true,
  });
  translationsWritten += written.count;

  const curatedPrimaryIds = [...curatedPrimaryByLexeme.values()];
  if (curatedPrimaryIds.length > 0) {
    await prisma.lexemeTranslation.updateMany({
      where: { id: { in: curatedPrimaryIds } },
      data: { isPrimary: true },
    });
  }

  const seeded = await prisma.lexemeTranslation.findMany({
    where: {
      lexemeId: { in: ids },
      targetLang: STUDY_TARGET_LANG,
      source: "seed",
    },
    select: { id: true },
  });
  await prisma.lexemeTranslationConfirmation.createMany({
    data: seeded.map((row) => ({
      translationId: row.id,
      userId: "__seed_lexicon__",
    })),
    skipDuplicates: true,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
