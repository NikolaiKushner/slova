"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DrillBar } from "@/components/practice/drill-bar";
import { DrillSummary } from "@/components/practice/drill-summary";
import { useFocusMode } from "@/components/practice/use-focus-mode";
import {
  AnswerFeedback,
  QuestionView,
  type Answered,
} from "@/components/practice/question-view";
import { passed } from "@/lib/practice/answer";
import {
  buildQuestion,
  needsAudio,
  type ExerciseKind,
  type PracticeWord,
} from "@/lib/practice/question";
import { whenVoiceReady } from "@/lib/practice/speech";
import { sessionQuery } from "@/lib/practice/catalog";

/**
 * One training, one format, straight through the words.
 *
 * Deliberately not a queue: a single training is practice, and its job is to
 * ask each word once and record how it went. Drilling a word until it sticks
 * is what Brainstorm is for, and mixing the two would make both vaguer.
 *
 * The outcome of each answer goes to the same review endpoint the daily
 * session uses — a right answer is a "good", a wrong one an "again". There is
 * no second scheduler hiding in here.
 */

type Payload = { words: PracticeWord[]; pool: PracticeWord[]; seed: string };

export function PracticeSession({
  kind,
  title,
  setIds,
}: {
  kind: ExerciseKind;
  title: string;
  /** Empty means the whole dictionary. */
  setIds: string[];
}) {
  const t = useTranslations("practice");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [voice, setVoice] = useState<boolean | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Answered | null>(null);
  const [right, setRight] = useState(0);
  // Bumped by "Once more". It re-runs the fetch, so the second sitting asks
  // whatever is due *now* — the words just rated are not due any more, and
  // repeating the same twenty would be drilling a list rather than practising.
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetch(`/api/practice/session?${sessionQuery(setIds)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: Payload | null) => {
        if (ignore) return;
        setData(payload);
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [setIds, run]);

  // Only the sound formats care, so only they ask — and the answer arrives in
  // the callback rather than being set from the body of the effect.
  useEffect(() => {
    if (!needsAudio(kind)) return;
    let ignore = false;
    whenVoiceReady().then((ready) => {
      if (!ignore) setVoice(ready);
    });
    return () => {
      ignore = true;
    };
  }, [kind]);

  const words = data?.words ?? [];
  const word = words[index];
  const running = !loading && words.length > 0 && index < words.length;

  // The menu steps back while a question is on screen — see globals.css.
  useFocusMode(running);

  const question = useMemo(
    () =>
      word
        ? buildQuestion(kind, word, data?.pool ?? [], data?.seed ?? "")
        : null,
    [word, kind, data],
  );

  const record = useCallback((wordId: string, correct: boolean) => {
    // Sent and forgotten: a training that pauses between questions to wait for
    // the network is a worse training, and a lost rating costs one interval.
    void fetch("/api/study/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId, rating: correct ? "good" : "again" }),
    }).catch(() => {});
  }, []);

  function answer(given: Answered) {
    if (!word) return;
    setResult(given);
    if (passed(given.verdict)) setRight((count) => count + 1);
    record(word.id, passed(given.verdict));
  }

  function next() {
    // Read the clock once, here, rather than during the render of the summary:
    // `Date.now()` in a render body would give a different answer every time
    // React looked at it.
    if (index + 1 >= words.length) setSeconds((Date.now() - startedAt) / 1000);
    setResult(null);
    setIndex((current) => current + 1);
  }

  function restart() {
    setLoading(true);
    setIndex(0);
    setResult(null);
    setRight(0);
    setStartedAt(Date.now());
    setSeconds(0);
    setRun((current) => current + 1);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (needsAudio(kind) && voice === false) {
    return <Empty title={t("noVoiceTitle")} body={t("noVoiceBody")} />;
  }

  if (words.length === 0) {
    return (
      <Empty
        title={t("noWordsTitle")}
        body={t("noWordsBody")}
        action={{ href: "/dictionary", label: t("goToMyWords") }}
      />
    );
  }

  if (index >= words.length) {
    return (
      <DrillSummary
        right={right}
        total={words.length}
        seconds={seconds}
        onRestart={restart}
      />
    );
  }

  return (
    <div>
      <DrillBar
        current={index + 1}
        total={words.length}
        right={right}
        missed={index - right}
      />

      <div className="mx-auto max-w-[520px] space-y-8 py-10">
        {/* The training's own name, over its question. On an audio format it
            is the only thing that says what is being asked of you. */}
        <p className="text-brand-soft text-center text-[11px] font-semibold tracking-[0.16em] uppercase">
          {title}
        </p>

        {/* The question stays put once answered — the coloured option beside
            the one you picked is the part worth looking at. */}
        {question && (
          <QuestionView
            question={question}
            onAnswered={answer}
            answered={result !== null}
          />
        )}

        {question && (
          <AnswerFeedback
            result={result}
            answer={
              "answer" in question
                ? question.answer
                : question.options[question.answerIndex]
            }
            onNext={next}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Local shim over the shared empty state, so the three call sites below keep
 * reading as one sentence each. `screen` variant: a session that has nothing
 * to ask is not a slot with something missing from it, it is the whole view.
 */
function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <EmptyState
      variant="screen"
      title={title}
      description={body}
      action={
        action ? (
          <Button size="lg" render={<Link href={action.href} />}>
            {action.label}
          </Button>
        ) : null
      }
    />
  );
}
