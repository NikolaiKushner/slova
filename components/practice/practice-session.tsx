"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChevronLeft } from "lucide-react";

import {
  FocusAnswer,
  FocusFooter,
  FocusHead,
  FocusPrompt,
  FocusShell,
  FocusTopBar,
  LinearProgress,
} from "@/components/layout/focus-shell";
import { AnswerFeedback } from "@/components/slova/answer-feedback";
import { KeyHints } from "@/components/slova/key-hints";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DrillSkeleton } from "@/components/practice/session-skeleton";
import { DrillSummary } from "@/components/practice/drill-summary";
import { QuestionView, type Answered } from "@/components/practice/question-view";
import { passed } from "@/lib/practice/answer";
import { audioAvailable } from "@/lib/practice/audio-capability";
import {
  buildQuestion,
  needsAudio,
  type ExerciseKind,
  type PracticeWord,
} from "@/lib/practice/question";
import { whenVoiceReady } from "@/lib/practice/speech";
import { sourceQuery, type Source } from "@/lib/practice/source";

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

type Payload = {
  words: PracticeWord[];
  pool: PracticeWord[];
  seed: string;
  onDemandAudioEnabled: boolean;
};

export function PracticeSession({
  kind,
  source,
}: {
  kind: ExerciseKind;
  /** Empty means the whole dictionary. */
  source: Source;
}) {
  const t = useTranslations("practice");
  const trainings = useTranslations("trainings");
  const common = useTranslations("common");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [voice, setVoice] = useState<boolean | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Answered | null>(null);
  /** Days until this word is due again, straight from the scheduler. */
  const [interval, setInterval_] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  // Bumped by "Once more". It re-runs the fetch, so the second sitting asks
  // whatever is due *now* — the words just rated are not due any more, and
  // repeating the same twenty would be drilling a list rather than practising.
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetch(`/api/practice/session?${sourceQuery(source)}`)
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
  }, [source, run]);

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
  const onDemandAudioEnabled = data?.onDemandAudioEnabled === true;
  const audioReady = audioAvailable(
    words,
    voice === true,
    onDemandAudioEnabled,
  );

  const question = useMemo(
    () =>
      word
        ? buildQuestion(kind, word, data?.pool ?? [], data?.seed ?? "")
        : null,
    [word, kind, data],
  );

  /* Per §14 and the mockup: after a verdict only "Enter дальше" remains. */
  const hints =
    result !== null
      ? [{ keys: [t("keyEnter")], label: t("hintNext") }]
      : question && "options" in question
        ? [
            { keys: ["1", String(question.options.length)], label: t("hintPick") },
            ...(kind === "audio-choice"
              ? [{ keys: [t("keySpace")], label: t("hintRepeat") }]
              : []),
          ]
        : question && "letters" in question
          ? [
              { keys: [], label: t("hintTypeLetters") },
              { keys: [t("keyBackspace")], label: t("hintTakeBack") },
            ]
          : [
              { keys: [t("keyEnter")], label: t("hintCheck") },
              ...(kind === "listening"
                ? [{ keys: [t("keySpace")], label: t("hintRepeat") }]
                : []),
            ];

  /*
   * Sent and not waited on: a training that pauses between questions to wait
   * for the network is a worse training, and a lost rating costs one interval.
   * The reply is used when it arrives — it carries the real next interval, and
   * "вернётся через N дней" has to be the schedule's answer rather than a
   * plausible-looking number.
   */
  const record = useCallback((wordId: string, correct: boolean) => {
    void fetch("/api/study/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId, rating: correct ? "good" : "again" }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { word?: { intervalDays?: number } } | null) => {
        const days = payload?.word?.intervalDays;
        if (typeof days === "number") setInterval_(days);
      })
      .catch(() => {});
  }, []);

  function answer(given: Answered) {
    if (!word) return;
    setInterval_(null);
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
    return <DrillSkeleton />;
  }

  if (needsAudio(kind) && voice !== null && !audioReady) {
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
    <FocusShell
      topBar={
        <FocusTopBar
          leading={
            <Button variant="ghost" size="sm" render={<Link href="/practice" />}>
              <ChevronLeft />
              {t("title")}
            </Button>
          }
          progress={
            <LinearProgress
              current={index + 1}
              total={words.length}
              label={t("progressOf", { current: index + 1, total: words.length })}
            />
          }
          trailing={
            <>
              {/*
                Right and missed rather than a score: "14 / 20" mid-drill reads
                as a grade to protect, "3 мимо" reads as three words coming back.
              */}
              <span className="text-success text-caption tabular-nums">
                {t("rightN", { count: right })}
              </span>
              <span className="text-destructive text-caption tabular-nums">
                {t("missedN", { count: index - right })}
              </span>
            </>
          }
        />
      }
    >
      <FocusHead
        task={trainings(`${kind}.task` as "typing.task")}
        step={t("wordOf", { current: index + 1, total: words.length })}
      />

      {question && (
        <>
          <FocusPrompt>
            <QuestionView
              question={question}
              answered={result !== null}
              onAnswered={() => {}}
              part="prompt"
              onDemandAudioEnabled={onDemandAudioEnabled}
            />
          </FocusPrompt>

          <FocusAnswer>
            <QuestionView
              question={question}
              answered={result !== null}
              onAnswered={answer}
              part="answer"
              onDemandAudioEnabled={onDemandAudioEnabled}
            />
          </FocusAnswer>

          <FocusFooter>
            <AnswerFeedback
              verdict={
                result === null
                  ? null
                  : result.verdict === "correct"
                    ? "correct"
                    : result.verdict === "almost"
                      ? "almost"
                      : "incorrect"
              }
              /* Blank until the schedule answers, rather than a guess. */
              note={
                result === null || interval === null
                  ? undefined
                  : interval >= 1
                    ? t("backIn", { days: Math.round(interval) })
                    : t("backToday")
              }
              className="min-w-0 flex-1"
            />
            <Button
              size="lg"
              onClick={next}
              autoFocus
              className={result === null ? "invisible" : undefined}
            >
              {common("next")}
            </Button>
          </FocusFooter>

          <KeyHints className="mt-4 justify-center" hints={hints} />
        </>
      )}
    </FocusShell>
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
