"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnswerFeedback,
  QuestionView,
  type Answered,
} from "@/components/practice/question-view";
import { passed } from "@/lib/practice/answer";
import {
  answerBrainstorm,
  AUDIO_LADDER,
  currentTask,
  DEFAULT_LADDER,
  graduate,
  isFinished,
  startBrainstorm,
  type BrainstormState,
} from "@/lib/practice/brainstorm";
import { buildQuestion, type PracticeWord } from "@/lib/practice/question";
import { speak, whenVoiceReady } from "@/lib/practice/speech";

/**
 * Brainstorm: the ladder, drawn.
 *
 * All the thinking lives in `lib/practice/brainstorm.ts` as a pure function,
 * so this is only ever asking it what to show and telling it what happened.
 * The one thing worth noticing here is what is *not* shown: no percentage.
 * A progress bar in a drill-to-mastery session turns it into a number to be
 * pushed to 100, and people start guessing to move it. What is shown is how
 * many words are still in the room, which is the truth and cannot be gamed.
 */

type Payload = { words: PracticeWord[]; pool: PracticeWord[]; seed: string };

export function BrainstormSession() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<BrainstormState | null>(null);
  const [result, setResult] = useState<Answered | null>(null);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      fetch("/api/practice/session?mode=brainstorm")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      whenVoiceReady(),
    ]).then(([payload, voice]: [Payload | null, boolean]) => {
      if (ignore) return;
      setData(payload);
      // The audio rungs are added only when there is a voice to speak them:
      // a silent device gets a shorter ladder, not an impossible one.
      if (payload?.words.length) {
        setState(
          startBrainstorm(payload.words, voice ? AUDIO_LADDER : DEFAULT_LADDER),
        );
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const task = state ? currentTask(state) : null;
  const word = data?.words.find((w) => w.id === task?.wordId) ?? null;

  const question = useMemo(() => {
    if (!task || !word || task.step === "card") return null;
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
        body: JSON.stringify({ wordId, ...graduate(word) }),
      }).catch(() => {});
    }
  }, []);

  function answer(given: Answered) {
    if (!state) return;
    setResult(given);
  }

  function next() {
    if (!state) return;
    const correct = result ? passed(result.verdict) : true;
    setResult(null);

    const advanced = answerBrainstorm(state, correct);
    setState(advanced);
    if (isFinished(advanced)) handOver(advanced);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!state || !data?.words.length) {
    return (
      <Done
        title="No new words waiting"
        body="Brainstorm takes words you have never studied. Add some to your dictionary and come back."
        href="/dictionary"
        label="Go to my words"
      />
    );
  }

  if (isFinished(state)) {
    const learned = state.mastered.length;
    const parked = state.struggling.length;
    return (
      <Done
        title={`${learned} learned`}
        body={
          parked > 0
            ? `${parked} put aside for today — those come back tomorrow rather than holding you here.`
            : "Every word went through the whole ladder. They are in your schedule now."
        }
        href="/practice"
        label="Back to trainings"
      />
    );
  }

  if (!task || !word) return null;

  return (
    <div className="space-y-8">
      <p className="text-brand-soft text-center text-xs tracking-widest uppercase">
        {task.remaining} {task.remaining === 1 ? "word" : "words"} left
      </p>

      {task.step === "card" ? (
        <WordCard word={word} onNext={next} />
      ) : question && !result ? (
        <QuestionView question={question} onAnswered={answer} />
      ) : question && result ? (
        <AnswerFeedback
          result={result}
          answer={
            "answer" in question
              ? question.answer
              : question.options[question.answerIndex]
          }
          onNext={next}
        />
      ) : null}
    </div>
  );
}

/**
 * The first look at a word: both sides at once, nothing to get wrong. Meeting
 * a word for the first time as a test teaches nothing — the drilling starts on
 * the next rung.
 */
function WordCard({ word, onNext }: { word: PracticeWord; onNext: () => void }) {
  useEffect(() => {
    speak(word.front);
  }, [word]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="font-display text-4xl">{word.front}</p>
      <p className="text-muted-foreground text-lg">{word.back}</p>
      <Button type="button" size="lg" onClick={onNext} autoFocus>
        Got it
      </Button>
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
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
      <Button size="lg" render={<Link href={href} />}>
        {label}
      </Button>
    </div>
  );
}
