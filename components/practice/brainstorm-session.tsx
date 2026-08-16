"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { AnswerFeedback } from "@/components/slova/answer-feedback";
import { Eyebrow } from "@/components/slova/eyebrow";
import { KeyHints } from "@/components/slova/key-hints";
import { StageRail, type StageRailWord } from "@/components/slova/stage-rail";
import {
  FocusAnswer,
  FocusFooter,
  FocusHead,
  FocusPrompt,
  FocusShell,
  FocusTopBar,
} from "@/components/layout/focus-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainstormStartSkeleton } from "@/components/practice/session-skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/empty-state";
import { QuestionView, type Answered } from "@/components/practice/question-view";
import { passed } from "@/lib/practice/answer";
import { audioAvailable } from "@/lib/practice/audio-capability";
import {
  answerBrainstorm,
  AUDIO_LADDER,
  currentTask,
  DEFAULT_LADDER,
  isFinished,
  SESSION_SIZE,
  SESSION_SIZES,
  startBrainstorm,
  type BrainstormState,
} from "@/lib/practice/brainstorm";
import { buildQuestion, type PracticeWord } from "@/lib/practice/question";
import { speak, whenVoiceReady } from "@/lib/practice/speech";
import { sourceQuery, type Source } from "@/lib/practice/source";

/**
 * Brainstorm: the ladder, drawn.
 *
 * All the thinking still lives in `lib/practice/brainstorm.ts` as a pure
 * function, so this only ever asks it what to show and tells it what happened.
 * What changed is the drawing: three views on the shells and the kit from §14
 * and §15.2, instead of a stack of ad-hoc boxes.
 *
 * The one thing worth noticing is what is *not* shown during a question. No
 * percentage — a progress bar in a drill-to-mastery session turns it into a
 * number to be pushed to 100 and people start guessing to move it. And no word
 * of the session anywhere near the rail, for the reason spelled out in
 * `StageRail`: the answer is always one of them.
 */

type Payload = {
  words: PracticeWord[];
  pool: PracticeWord[];
  seed: string;
  onDemandAudioEnabled: boolean;
};

export function BrainstormSession({ source }: { source: Source }) {
  const t = useTranslations("practice");
  const common = useTranslations("common");
  const trainings = useTranslations("trainings");

  const [size, setSize] = useState<number>(SESSION_SIZE);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<BrainstormState | null>(null);
  const [result, setResult] = useState<Answered | null>(null);
  // The words are read before they are drilled, not during.
  const [started, setStarted] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [answers, setAnswers] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      fetch(`/api/practice/session?${sourceQuery(source, { mode: "brainstorm", size: String(size) })}`)
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      whenVoiceReady(),
    ]).then(([payload, voice]: [Payload | null, boolean]) => {
      if (ignore) return;
      setData(payload);
      const audio = audioAvailable(
        payload?.words ?? [],
        voice,
        payload?.onDemandAudioEnabled === true,
      );
      setHasAudio(audio);
      // Audio rungs need either a voice or complete recording coverage:
      // a partly silent session gets a shorter ladder, not an impossible one.
      if (payload?.words.length) {
        setState(
          startBrainstorm(payload.words, audio ? AUDIO_LADDER : DEFAULT_LADDER),
        );
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [source, size]);

  const task = state && started ? currentTask(state) : null;
  const word = data?.words.find((w) => w.id === task?.wordId) ?? null;

  const question = useMemo(() => {
    if (!task || !word) return null;
    // Seeded per rung as well as per word: the same word met again on a higher
    // rung should not come back with the options in the order just memorised.
    return buildQuestion(task.step, word, data?.pool ?? [], `${data?.seed ?? ""}-${task.step}`);
  }, [task, word, data]);

  /**
   * Hand a finished word to the scheduler with what the session learned about
   * it: a clean run starts further out than one that took six goes.
   */
  const handOver = useCallback((state: BrainstormState) => {
    for (const wordId of state.mastered) {
      const word = state.words.find((w) => w.wordId === wordId);
      if (!word) continue;
      void fetch("/api/practice/graduate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, errors: word.errors }),
      }).catch(() => {});
    }
  }, []);

  function next() {
    if (!state) return;
    const correct = result ? passed(result.verdict) : true;
    setResult(null);

    const advanced = answerBrainstorm(state, correct);
    setState(advanced);
    if (isFinished(advanced)) {
      handOver(advanced);
      if (startedAt) setElapsed(Math.round((Date.now() - startedAt) / 1000));
    }
  }

  if (loading) {
    return <BrainstormStartSkeleton />;
  }

  if (!state || !data?.words.length) {
    return (
      <Done
        title={t("noNewTitle")}
        body={t("noNewBody")}
        href="/dictionary"
        label={t("goToMyWords")}
      />
    );
  }

  if (!started) {
    return (
      <Start
        words={data.words}
        hasAudio={hasAudio}
        size={size}
        ladder={hasAudio ? AUDIO_LADDER : DEFAULT_LADDER}
        onDemandAudioEnabled={data.onDemandAudioEnabled}
        onSize={(next) => {
          // Set here rather than in the effect: the skeleton is a consequence of
          // the choice, and `react-hooks/set-state-in-effect` is right that an
          // effect is the wrong place to say so.
          setLoading(true);
          setSize(next);
        }}
        onStart={() => {
          setAnswers(0);
          setStartedAt(Date.now());
          setStarted(true);
        }}
      />
    );
  }

  if (isFinished(state)) {
    return (
      <Summary
        state={state}
        words={data.words}
        answers={answers}
        seconds={elapsed}
        onAgain={() => {
          setStarted(false);
          setState(startBrainstorm(data.words, hasAudio ? AUDIO_LADDER : DEFAULT_LADDER));
        }}
      />
    );
  }

  if (!task || !word || !question) return null;

  const rail: StageRailWord[] = state.words.map((entry) => ({
    id: entry.wordId,
    stage: entry.pos,
    total: entry.ladder.length,
  }));
  const mastered = state.mastered.length + state.struggling.length;
  const current = state.words.find((entry) => entry.wordId === task.wordId);
  const answer =
    "answer" in question ? question.answer : question.options[question.answerIndex];

  return (
    <FocusShell
      topBar={
        <FocusTopBar
          leading={
            <Button variant="ghost" size="sm" render={<Link href="/practice" />}>
              <ChevronLeft />
              {t("exitSession")}
            </Button>
          }
          progress={<StageRail words={rail} currentId={task.wordId} />}
          trailing={
            <span className="text-muted-foreground text-caption tabular-nums">
              {t("masteredOf", { done: mastered, total: state.words.length })}
            </span>
          }
        />
      }
    >
      {/* Same head as a single-format session: what is being asked, then where
          you are. The rung replaces the word count; nothing else differs. */}
      <FocusHead
        task={trainings(`${task.step}.task` as "typing.task")}
        step={t("stageOf", {
          stage: (current?.pos ?? 0) + 1,
          total: current?.ladder.length ?? 0,
        })}
      />

      <FocusPrompt>
        <QuestionView
          question={question}
          answered={result !== null}
          onAnswered={() => {}}
          part="prompt"
          onDemandAudioEnabled={data.onDemandAudioEnabled}
        />
      </FocusPrompt>

      <FocusAnswer>
        <QuestionView
          question={question}
          answered={result !== null}
          onAnswered={(given) => {
            setAnswers((count) => count + 1);
            setResult(given);
          }}
          part="answer"
          onDemandAudioEnabled={data.onDemandAudioEnabled}
        />
      </FocusAnswer>

      <FocusFooter className="justify-between gap-4">
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
          answer={answer}
          note={stageNote(t, state, task.wordId, result)}
          className="min-w-0 flex-1"
        />
        {result !== null ? (
          <Button size="default" onClick={next} autoFocus>
            {common("next")}
          </Button>
        ) : null}
      </FocusFooter>

      <KeyHints
        className="mt-4 justify-center"
        hints={
          result !== null
            ? [{ keys: [t("keyEnter")], label: t("hintNext") }]
            : "options" in question
              ? [
                  { keys: ["1", String(question.options.length)], label: t("hintPick") },
                  ...(question.kind === "audio-choice"
                    ? [{ keys: [t("keySpace")], label: t("hintRepeat") }]
                    : []),
                ]
              : "letters" in question
                ? [
                    { keys: [], label: t("hintTypeLetters") },
                    { keys: [t("keyBackspace")], label: t("hintTakeBack") },
                  ]
                : [{ keys: [t("keyEnter")], label: t("hintCheck") }]
        }
      />
    </FocusShell>
  );
}

/**
 * What the answer did to the word's position on the ladder. Never the word —
 * the same rule as the rail, since this line sits on the question screen.
 */
function stageNote(
  t: ReturnType<typeof useTranslations<"practice">>,
  state: BrainstormState,
  wordId: string,
  result: Answered | null,
) {
  if (!result) return undefined;
  const word = state.words.find((entry) => entry.wordId === wordId);
  if (!word) return undefined;

  const from = word.pos + 1;
  const to = passed(result.verdict) ? from + 1 : Math.max(1, from - 1);
  if (passed(result.verdict) && from >= word.ladder.length) return t("wordMastered");
  if (from === to) return t("stageFirst");
  return t("stageMoved", { from, to });
}

/**
 * The words, all of them, before anything is asked.
 *
 * Reading the pairs takes a few seconds and makes the drilling that follows a
 * test of what was just read rather than a guess at what was never shown. This
 * and the summary are the only two screens allowed to name the session's
 * words — the first before anything is asked, the second after everything is.
 */
function Start({
  words,
  hasAudio,
  size,
  ladder,
  onDemandAudioEnabled,
  onSize,
  onStart,
}: {
  words: PracticeWord[];
  hasAudio: boolean;
  size: number;
  ladder: readonly string[];
  onDemandAudioEnabled: boolean;
  onSize: (size: number) => void;
  onStart: () => void;
}) {
  const t = useTranslations("practice");
  const trainings = useTranslations("trainings");

  return (
    <div className="container-focus flex w-full flex-col gap-8 py-4">
      <header className="text-center">
        <Eyebrow>{t("brainstormKicker")}</Eyebrow>
        <h1 className="text-h1">{t("previewNew", { count: words.length })}</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-[44ch] text-body">
          {t("brainstormIntro")}
        </p>
      </header>

      <div className="bg-card border-border divide-border-subtle divide-y overflow-hidden rounded-xl border">
        {words.map((word) => (
          <div key={word.id} className="flex items-center gap-3.5 px-5 py-3">
            <span lang="en" className="font-display min-w-[120px] text-xl font-medium">
              {word.front}
            </span>
            {hasAudio ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("listenTo", { word: word.front })}
                onClick={() =>
                  void speak(word.front, word.audioUrl, {
                    onDemand: onDemandAudioEnabled,
                  })
                }
              >
                <Volume2 />
              </Button>
            ) : null}
            <span className="text-muted-foreground ml-auto text-right">
              {word.back}
            </span>
          </div>
        ))}
      </div>

      {/* The rungs, named. Safe here: nothing has been asked yet. */}
      <div className="flex flex-wrap justify-center gap-2">
        {ladder.map((step, index) => (
          <Badge key={step} variant="outline" className="h-7 gap-1.5 px-3">
            <span className="text-disabled-foreground tabular-nums">{index + 1}</span>
            {trainings(`${step}.title` as "brainstorm.title")}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3.5">
        <ToggleGroup
          value={[String(size)]}
          onValueChange={(value) => {
            const picked = Number.parseInt(value[0] ?? "", 10);
            if (Number.isInteger(picked)) onSize(picked);
          }}
          aria-label={t("sessionSize")}
          className="bg-card border-border rounded-md border p-0.5"
        >
          {SESSION_SIZES.map((option) => (
            <ToggleGroupItem
              key={option}
              value={String(option)}
              /*
               * Both spellings: the primitive marks the chosen item with
               * `aria-pressed` and with `data-state`, and overriding only one
               * leaves the mint plate §13 asks for painted half the time.
               */
              className="aria-pressed:bg-accent aria-pressed:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {t("sizeWords", { count: option })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Button size="lg" onClick={onStart} autoFocus>
          {t("startIn", { minutes: Math.max(1, Math.round(words.length * 1.2)) })}
        </Button>
      </div>
    </div>
  );
}

/** The session, after it is over: what was learned and how it went. */
function Summary({
  state,
  words,
  answers,
  seconds,
  onAgain,
}: {
  state: BrainstormState;
  words: PracticeWord[];
  answers: number;
  seconds: number;
  onAgain: () => void;
}) {
  const t = useTranslations("practice");
  const learned = state.mastered.length;
  const parked = state.struggling.length;

  return (
    <div className="container-focus flex w-full flex-col gap-8 py-4">
      <header className="text-center">
        <Eyebrow>{t("doneEyebrow")}</Eyebrow>
        <h1 className="text-h1">{t("learnedCount", { count: learned })}</h1>
        <p className="text-muted-foreground mt-2 text-body">
          {parked > 0 ? t("parked", { count: parked }) : t("ladderDone")}
        </p>
      </header>

      <div className="flex justify-center gap-9">
        {/* The sitting, not the tally — the title above already says how many were learned. */}
        <Stat value={String(state.words.length)} label={t("statWords")} />
        <Stat value={String(answers)} label={t("statAnswers")} />
        <Stat
          value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
          label={t("scoreTime")}
        />
      </div>

      <div className="bg-card border-border divide-border-subtle divide-y overflow-hidden rounded-xl border">
        {state.words.map((entry) => {
          const word = words.find((w) => w.id === entry.wordId);
          if (!word) return null;
          return (
            <div key={entry.wordId} className="flex items-center gap-3.5 px-5 py-3">
              <span lang="en" className="font-display min-w-[110px] text-h4">
                {word.front}
              </span>
              <span className="text-muted-foreground text-body-sm">{word.back}</span>
              <Badge
                variant={entry.errors ? "outline" : "secondary"}
                className={
                  entry.errors
                    ? "text-warning border-warning-border bg-warning-bg ml-auto"
                    : "ml-auto"
                }
              >
                {entry.errors ? t("roughRun", { count: entry.errors }) : t("cleanRun")}
              </Badge>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="lg" onClick={onAgain}>
          {t("moreNewWords")}
        </Button>
        <Button size="lg" render={<Link href="/practice" />}>
          {t("backToTrainings")}
        </Button>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-numeral">{value}</div>
      <div className="text-muted-foreground mt-1 text-caption">{label}</div>
    </div>
  );
}

function Done({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <EmptyState
      variant="screen"
      title={title}
      description={body}
      action={
        <Button size="lg" render={<Link href={href} />}>
          {label}
        </Button>
      }
    />
  );
}
