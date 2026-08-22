"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle } from "lucide-react";

import { useStudySitting } from "@/hooks/use-study-sitting";
import { SpeakButton } from "@/components/slova/speak-button";
import { Token } from "@/components/slova/token";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dictionaryStateOf, type DictionaryState } from "@/lib/stories/reader-view";
import type { ReaderParagraph, ReaderWord } from "@/lib/texts/reader-view";
import { cn } from "@/lib/utils";
import type { RatedWord } from "@/lib/word-rating";

/**
 * A pasted text, with the words this dictionary knows about marked, and only
 * those — docs/design-system.md §15.9 says why the absent ones carry no mark.
 */

const UNDERLINE = "underline decoration-2 underline-offset-[3px]";

const READING_BEAT_MS = 30_000;

const MARK: Record<DictionaryState, string> = {
  known: `${UNDERLINE} decoration-data-learned`,
  learning: `${UNDERLINE} decoration-data-learning`,
  absent: "",
};

export function TextReader({
  textId,
  paragraphs,
}: {
  textId: string;
  paragraphs: ReaderParagraph[];
}) {
  const [added, setAdded] = useState<Record<string, RatedWord>>({});

  // Nothing to answer, so the sitting records time and nothing else — §8.
  const { touch } = useStudySitting({
    active: true,
    kind: "reading",
    label: textId,
    sourceState: "all",
  });

  // `durationSec` only advances on a patch, and reading never sends one. The
  // beat stops while the tab is hidden, so a text left open overnight adds
  // nothing to the week.
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void touch();
    };
    const timer = window.setInterval(beat, READING_BEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [touch]);

  return (
    <div className="mt-8 space-y-3.5" lang="en">
      {paragraphs.map((paragraph) => (
        <p key={paragraph.id} className="text-story max-w-[68ch]">
          {paragraph.segments.map((segment, index) =>
            segment.kind === "text" ? (
              <span key={index}>{segment.text}</span>
            ) : (
              <WordSpan
                key={segment.word.id}
                word={segment.word}
                textId={textId}
                state={
                  added[segment.word.lemma]
                    ? dictionaryStateOf(added[segment.word.lemma])
                    : segment.word.state
                }
                onAdded={(record) =>
                  setAdded((current) => ({
                    ...current,
                    [segment.word.lemma]: record,
                  }))
                }
              />
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function WordSpan({
  word,
  textId,
  state,
  onAdded,
}: {
  word: ReaderWord;
  textId: string;
  state: DictionaryState;
  onAdded: (record: RatedWord) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "-my-0.5 touch-manipulation py-0.5 [text-decoration-skip-ink:auto]",
              MARK[state],
            )}
          />
        }
      >
        {word.text}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[300px]">
        <WordGloss
          word={word}
          textId={textId}
          state={state}
          onAdded={onAdded}
        />
      </PopoverContent>
    </Popover>
  );
}

function WordGloss({
  word,
  textId,
  state,
  onAdded,
}: {
  word: ReaderWord;
  textId: string;
  state: DictionaryState;
  onAdded: (record: RatedWord) => void;
}) {
  const t = useTranslations("texts");
  const [pending, setPending] = useState<"add" | "gloss" | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [gloss, setGloss] = useState<string | null>(null);

  const showsBaseForm = word.lemma !== word.text.toLowerCase();
  const translation = word.translation ?? gloss;

  async function ask<T>(path: string, fallback: string): Promise<T> {
    const response = await fetch(`/api/texts/${textId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: word.id }),
    });
    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: string })
      | null;
    if (!response.ok || !payload) throw new Error(payload?.error ?? fallback);
    return payload;
  }

  async function run(what: "add" | "gloss") {
    setPending(what);
    setFailed(null);
    try {
      if (what === "gloss") {
        const { gloss: answer } = await ask<{ gloss: string }>(
          "gloss",
          t("glossFailed"),
        );
        setGloss(answer);
      } else {
        const { word: added } = await ask<{
          word: { introducedAt: string | null; intervalDays: number };
        }>("words", t("addWordFailed"));
        onAdded({
          introducedAt: added.introducedAt ? new Date(added.introducedAt) : null,
          intervalDays: added.intervalDays,
        });
      }
    } catch (cause) {
      setFailed(cause instanceof Error ? cause.message : t("addWordFailed"));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-1">
      <p className="text-h4" lang="en">
        {word.text}
        {showsBaseForm ? (
          <>
            <span className="mx-1.5 text-muted-foreground text-body-sm">→</span>
            <Token>{word.lemma}</Token>
          </>
        ) : null}
      </p>
      <SpeakButton text={word.lemma} />

      <p className="text-body-sm text-foreground">
        {translation ?? (
          <span className="text-muted-foreground">{t("noTranslation")}</span>
        )}
      </p>

      <p className="text-caption text-muted-foreground">
        {state === "known"
          ? t("dictionaryKnown")
          : state === "learning"
            ? t("dictionaryLearning")
            : t("dictionaryAbsent")}
      </p>

      {gloss === null ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => void run("gloss")}
          disabled={pending !== null}
        >
          {pending === "gloss" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : null}
          {t("meaningHere")}
        </Button>
      ) : null}

      {state === "absent" && translation ? (
        <Button
          size="sm"
          className="w-full"
          onClick={() => void run("add")}
          disabled={pending !== null}
        >
          {pending === "add" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : null}
          {t("addWord")}
        </Button>
      ) : null}
      {failed ? <p className="text-caption text-destructive">{failed}</p> : null}
    </div>
  );
}
