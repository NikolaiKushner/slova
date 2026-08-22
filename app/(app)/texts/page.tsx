import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { DeleteTextButton } from "@/components/texts/text-actions";
import { TextComposer } from "@/components/texts/text-composer";
import { TextCoverage } from "@/components/texts/text-coverage";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { coverageOf } from "@/lib/texts/coverage";
import { MAX_TEXTS } from "@/lib/texts/draft";
import { ASSUMED_KNOWN_WORDS, knownKeys } from "@/lib/texts/known-words";
import { lemmatize } from "@/lib/texts/lemma";
import { parseText } from "@/lib/texts/tokenize";

/** `/texts` — docs/plans/reader.md §6.2, rows not cards as in docs/design-system.md §15.8. */
export default async function TextsPage() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const t = await getTranslations("texts");
  const prisma = getPrisma();
  const [rows, dictionary] = await Promise.all([
    prisma.userText.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, wordCount: true, body: true },
    }),
    prisma.userWord.findMany({ where: { userId }, select: { key: true } }),
  ]);

  const known = knownKeys(dictionary);
  const texts = rows.map(({ body, ...text }) => ({
    ...text,
    coverage: coverageOf(parseText(body, lemmatize), known),
  }));

  return (
    <PageContainer container="list">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="space-y-10">
        <div className="space-y-3">
          <TextComposer atLimit={texts.length >= MAX_TEXTS} />
          {texts.length === 0 ? (
            <p className="text-caption text-muted-foreground px-1">
              {t("firstPaste")}
            </p>
          ) : null}
        </div>

        {texts.length > 0 ? (
          <Section title={t("yourTexts")}>
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {texts.map((text) => (
                  <li key={text.id} className="flex items-center gap-1">
                    <Link
                      href={`/texts/${text.id}`}
                      className="hover:bg-secondary/60 flex min-w-0 flex-1 items-center gap-3 rounded-l-lg px-4 py-3.5 md:px-5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium" lang="en">
                          {text.title}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          {t("words", { count: text.wordCount })}
                        </span>
                        <TextCoverage compact coverage={text.coverage} />
                      </span>
                      <ChevronRight
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                    </Link>
                    <span className="pr-3 md:pr-4">
                      <DeleteTextButton id={text.id} title={text.title} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="text-caption text-muted-foreground mt-3 px-1">
              {t("coverageNote", { count: ASSUMED_KNOWN_WORDS })}
            </p>
          </Section>
        ) : null}
      </div>
    </PageContainer>
  );
}
