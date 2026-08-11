"use client";

import { useState } from "react";

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
 * the list is the reason to add. `<PageWide>` because this is a grid of
 * records rather than something to read.
 */
export default function DictionaryPage() {
  // Bumped after an add. Used as a `key`, so the list remounts: it starts on
  // page one with fresh data, which is where a just-added word will be — and
  // no effect has to reach in and reset it.
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <PageWide>
      <PageHeader
        eyebrow="Dictionary"
        title="My words"
        description="Type or paste words — translations fill themselves in. Everything you have is listed below."
      />

      <div className="space-y-10">
        <Section title="Add words">
          <AddWordsPanel onAdded={() => setReloadKey((key) => key + 1)} />
        </Section>

        <Section title="All words">
          <WordListTable key={reloadKey} />
        </Section>
      </div>
    </PageWide>
  );
}
