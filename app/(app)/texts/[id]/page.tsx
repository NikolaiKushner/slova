import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageBack } from "@/components/page-back";
import { PageContainer } from "@/components/layout/app-shell";
import { TextCoverage } from "@/components/texts/text-coverage";
import { TextReader } from "@/components/texts/text-reader";
import { getSession } from "@/lib/auth";
import { lookupBatch } from "@/lib/lexicon/lookup";
import { getPrisma } from "@/lib/prisma";
import { coverageOf } from "@/lib/texts/coverage";
import { knownKeys } from "@/lib/texts/known-words";
import { lemmatize } from "@/lib/texts/lemma";
import { buildReaderParagraphs, uniqueKeys } from "@/lib/texts/reader-view";
import { parseText } from "@/lib/texts/tokenize";

type Params = { params: Promise<{ id: string }> };

/** `/texts/[id]` — docs/plans/shipped/reader.md §6.3. */
export default async function TextPage({ params }: Params) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { id } = await params;
  const t = await getTranslations("texts");
  const prisma = getPrisma();

  const text = await prisma.userText.findFirst({
    where: { id, userId },
    select: { title: true, body: true, wordCount: true },
  });
  if (!text) notFound();

  const parsed = parseText(text.body, lemmatize);
  const keys = uniqueKeys(parsed.paragraphs);

  const [lexicon, words] = await Promise.all([
    lookupBatch(keys),
    prisma.userWord.findMany({
      where: { userId, key: { in: keys } },
      select: { key: true, introducedAt: true, intervalDays: true },
    }),
  ]);

  const dictionary = new Map(words.map((word) => [word.key, word]));
  const translations = new Map(
    [...lexicon.hits].map(([key, hit]) => [key, hit.translation]),
  );

  return (
    <PageContainer container="prose">
      <PageBack href="/texts" label={t("backToTexts")} />
      <h1 className="text-h2 mt-6" lang="en">
        {text.title}
      </h1>
      <div className="mt-1.5 space-y-0.5">
        <p className="text-muted-foreground text-caption">
          {t("words", { count: text.wordCount })}
        </p>
        <TextCoverage coverage={coverageOf(parsed, knownKeys(words))} />
      </div>

      <TextReader
        textId={id}
        paragraphs={buildReaderParagraphs(parsed.paragraphs, dictionary, translations)}
      />
    </PageContainer>
  );
}
