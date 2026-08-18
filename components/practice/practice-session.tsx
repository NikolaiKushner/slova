"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
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
import { MutationStatus } from "@/components/slova/mutation-status";
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
import type { VerbFormsSitting } from "@/lib/practice/verb-forms";
import { Eyebrow } from "@/components/slova/eyebrow";
import { useStudySitting } from "@/hooks/use-study-sitting";
import { useReliableMutations } from "@/hooks/use-reliable-mutations";

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
  sitting?: VerbFormsSitting;
  nextDueAt?: string | null;
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
  const [addingVerbs, setAddingVerbs] = useState(false);
  const [addVerbsError, setAddVerbsError] = useState(false);
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
  const [previewed, setPreviewed] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const {
    submit: submitMutation,
    flush: flushMutations,
    retryFailed,
    phase: mutationPhase,
    online,
    failedCount,
  } = useReliableMutations();

  useEffect(() => {
    let ignore = false;
    const query =
      kind === "verb-forms"
        ? new URLSearchParams({ kind }).toString()
        : sourceQuery(source, { kind });

    fetch(`/api/practice/session?${query}`)
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
  }, [source, run, kind]);

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

  const inSession =
    !loading &&
    words.length > 0 &&
    data?.sitting !== "caught-up" &&
    !(kind === "verb-forms" && data?.sitting === "intro" && !previewed);

  const { getIdAsync, elapsedMs, complete } = useStudySitting({
    active: inSession,
    resetKey: run,
    kind: "practice",
    label: kind,
    sourceState: source.state,
    setIds: source.setIds,
    cardKey: word?.id ?? null,
  });

  const question = useMemo(
    () =>
      word
        ? buildQuestion(kind, word, data?.pool ?? [], data?.seed ?? "")
        : null,
    [word, kind, data],
  );

  /* Per §14 and the mockup: after a verdict only "Enter next" remains. */
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
          : question?.kind === "verb-forms"
            ? [{ keys: [t("keyEnter")], label: t("hintCheck") }]
            : [
                { keys: [t("keyEnter")], label: t("hintCheck") },
                ...(kind === "listening"
                  ? [{ keys: [t("keySpace")], label: t("hintRepeat") }]
                  : []),
              ];

  // Answers stay non-blocking between cards, but every operation is tracked,
  // retried, and flushed before the summary replaces the session.
  const record = useCallback(
    (wordId: string, given: Answered, elapsed: number) => {
      const operationId = crypto.randomUUID();
      void submitMutation<{ word?: { intervalDays?: number } }>({
        id: operationId,
        endpoint: "/api/study/review",
        body: async () => {
          const sittingId = await getIdAsync();
          return {
              wordId,
              operationId,
              rating: passed(given.verdict) ? "good" : "again",
              sittingId: sittingId ?? undefined,
              kind,
              verdict: given.verdict,
              elapsedMs: elapsed,
          };
        },
        onSuccess(payload) {
          const days = payload?.word?.intervalDays;
          if (typeof days === "number") setInterval_(days);
        },
      });
    },
    [kind, getIdAsync, submitMutation],
  );

  function answer(given: Answered) {
    if (!word) return;
    setInterval_(null);
    setResult(given);
    if (passed(given.verdict)) setRight((count) => count + 1);
    record(word.id, given, elapsedMs());
  }

  const next = useCallback(async () => {
    // Read the clock once, here, rather than during the render of the summary:
    // `Date.now()` in a render body would give a different answer every time
    // React looked at it.
    if (index + 1 >= words.length) {
      setFinishing(true);
      setSeconds((Date.now() - startedAt) / 1000);
      await flushMutations();
      await complete();
      setFinishing(false);
    }
    setResult(null);
    setIndex((current) => current + 1);
  }, [complete, flushMutations, index, startedAt, words.length]);

  useEffect(() => {
    if (result === null) return;

    const frame = requestAnimationFrame(() => {
      nextButtonRef.current?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, a, input, textarea, select, [contenteditable]")
      ) {
        return;
      }

      event.preventDefault();
      void next();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [next, result]);

  function restart() {
    setLoading(true);
    setIndex(0);
    setResult(null);
    setRight(0);
    setStartedAt(Date.now());
    setSeconds(0);
    setPreviewed(false);
    setFinishing(false);
    setRun((current) => current + 1);
  }

  function addVerbTable() {
    if (addingVerbs) return;
    setAddingVerbs(true);
    setAddVerbsError(false);
    void fetch("/api/practice/verb-forms", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { setId?: string } | null) => {
        if (!payload?.setId) {
          setAddVerbsError(true);
          setAddingVerbs(false);
          return;
        }
        setAddingVerbs(false);
        restart();
      })
      .catch(() => {
        setAddVerbsError(true);
        setAddingVerbs(false);
      });
  }

  if (loading) {
    return <DrillSkeleton />;
  }

  if (needsAudio(kind) && voice !== null && !audioReady) {
    return <Empty title={t("noVoiceTitle")} body={t("noVoiceBody")} />;
  }

  if (kind === "verb-forms" && data?.sitting === "caught-up") {
    return <VerbFormsCaughtUp nextDueAt={data.nextDueAt ?? null} />;
  }

  if (words.length === 0) {
    if (kind === "verb-forms") {
      return (
        <EmptyState
          variant="screen"
          title={t("noVerbFormsTitle")}
          description={t("noVerbFormsBody")}
          action={
            <div className="flex flex-col items-center gap-2.5">
              <Button
                size="lg"
                onClick={addVerbTable}
                disabled={addingVerbs}
              >
                {addingVerbs ? t("addingVerbForms") : t("addVerbForms")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/courses/grammar/irregular-verbs" />}
              >
                {t("goToIrregularVerbs")}
              </Button>
              {addVerbsError ? (
                <p className="text-destructive text-caption">{t("addVerbFormsError")}</p>
              ) : null}
            </div>
          }
        />
      );
    }
    return (
      <Empty
        title={t("noWordsTitle")}
        body={t("noWordsBody")}
        action={{ href: "/dictionary", label: t("goToMyWords") }}
      />
    );
  }

  if (kind === "verb-forms" && data?.sitting === "intro" && !previewed) {
    return (
      <VerbFormsStart
        words={words}
        onStart={() => {
          setStartedAt(Date.now());
          setPreviewed(true);
        }}
      />
    );
  }

  if (index >= words.length) {
    return (
      <>
        <MutationStatus
          phase={mutationPhase}
          failedCount={failedCount}
          online={online}
          onRetry={() => void retryFailed()}
        />
        <DrillSummary
          right={right}
          total={words.length}
          seconds={seconds}
          onRestart={restart}
        />
      </>
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
                as a grade to protect, "3 missed" reads as three words coming back.
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
      <MutationStatus
        phase={mutationPhase}
        failedCount={failedCount}
        online={online}
        onRetry={() => void retryFailed()}
      />
      {/* No count here: the top bar's progress bar already carries it, and
          printing "word 3 of 10" under "3 of 10" says nothing twice (§15.2). */}
      <FocusHead task={trainings(`${kind}.task` as "typing.task")} />

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
              ref={nextButtonRef}
              size="lg"
              onClick={() => void next()}
              disabled={finishing}
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

/**
 * The triples of this sitting, before anything is asked. Same job as
 * Brainstorm's Start: a look, then a drill. Three English columns, course
 * labels, no Russian — the gloss waits on the question.
 */
function VerbFormsStart({
  words,
  onStart,
}: {
  words: PracticeWord[];
  onStart: () => void;
}) {
  const t = useTranslations("practice");
  const minutes = Math.max(1, Math.round(words.length * 0.8));

  return (
    <div className="container-focus flex w-full flex-col gap-8 py-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/practice" />}
        className="self-start"
      >
        <ChevronLeft />
        {t("title")}
      </Button>

      <header className="text-center">
        <Eyebrow>{t("verbFormsKicker")}</Eyebrow>
        <h1 className="text-h1">{t("verbFormsPreview", { count: words.length })}</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-[44ch] text-body">
          {t("verbFormsIntro")}
        </p>
      </header>

      <div className="bg-card border-border overflow-hidden rounded-xl border">
        <div className="text-overline text-eyebrow grid grid-cols-3 gap-x-4 px-5 py-2.5">
          <span>{t("baseForm")}</span>
          <span>{t("pastForm")}</span>
          <span>{t("participleForm")}</span>
        </div>
        {words.map((word) => (
          <div
            key={word.id}
            className="border-border-subtle grid grid-cols-3 gap-x-4 border-t px-5 py-2.5"
          >
            <span lang="en" className="font-display text-h4 font-medium">
              {word.front}
            </span>
            <span lang="en" className="font-display text-h4 font-medium">
              {word.forms?.past ?? "—"}
            </span>
            <span lang="en" className="font-display text-h4 font-medium">
              {word.forms?.participle ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={onStart} autoFocus>
          {t("startIn", { minutes })}
        </Button>
      </div>
    </div>
  );
}

function VerbFormsCaughtUp({ nextDueAt }: { nextDueAt: string | null }) {
  const t = useTranslations("practice");
  const format = useFormatter();
  const date = nextDueAt
    ? format.dateTime(new Date(nextDueAt), { day: "numeric", month: "long" })
    : null;

  return (
    <EmptyState
      variant="screen"
      title={t("verbFormsCaughtUpTitle")}
      description={
        date ? t("verbFormsCaughtUpBody", { date }) : t("verbFormsCaughtUpNoDate")
      }
      action={
        <Button size="lg" render={<Link href="/practice" />}>
          {t("backToTrainings")}
        </Button>
      }
    />
  );
}
