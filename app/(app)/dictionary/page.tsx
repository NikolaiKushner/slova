"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";

import { AddWordsPanel } from "@/components/add-words-panel";
import { PageWide } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { WordListTable } from "@/components/word-list-table";

/**
 * My words: add at the top, everything you have underneath.
 *
 * One screen rather than two, because the two halves answer each other — a
 * word added at the top appears in the list below without going anywhere, and
 * the list is the reason to add. Same width as every other app screen
 * (`<Page>` / `<PageWide>`): 828.5px, the iPad column.
 */
export default function DictionaryPage() {
  const t = useTranslations("dictionary");
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <PageWide>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("myWordsTitle")}
        description={t("myWordsDescription")}
      />

      <div className="space-y-10">
        <Section title={t("addWords")}>
          <AddWordsPanel onAdded={() => setReloadKey((key) => key + 1)} />
        </Section>

        <Section title={t("allWords")}>
          <Suspense fallback={null}>
            <WordListTable key={reloadKey} />
          </Suspense>
        </Section>
      </div>
    </PageWide>
  );
}
