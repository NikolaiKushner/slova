"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
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
  isFinished,
  startBrainstorm,
  type BrainstormState,
} from "@/lib/practice/brainstorm";
import { buildQuestion, type PracticeWord } from "@/lib/practice/question";
import { speak, whenVoiceReady } from "@/lib/practice/speech";
import { Volume2 } from "lucide-react";

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
  // The words are read before they are drilled, not during.
  const [started, setStarted] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);

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
      setHasVoice(voice);
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

  if (!started) {
    return (
      <Preview
        words={data.words}
        hasVoice={hasVoice}
        onStart={() => setStarted(true)}
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

      {question && !result ? (
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
 * The words, all of them, before anything is asked.
 *
 * Reading six pairs takes a few seconds and makes the drilling that follows a
 * test of what was just read rather than a guess at what was never shown. It
 * also puts the whole set in one place, which is the thing a card-at-a-time
 * introduction could not do.
 */
function Preview({
  words,
  hasVoice,
  onStart,
}: {
  words: PracticeWord[];
  hasVoice: boolean;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-brand-soft text-center text-xs tracking-widest uppercase">
        {words.length} new {words.length === 1 ? "word" : "words"}
      </p>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableBody>
            {words.map((word) => (
              <TableRow key={word.id}>
                <TableCell className="font-display w-1/2 text-lg">
                  <span className="inline-flex items-center gap-2">
                    {word.front}
                    {hasVoice && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Listen to ${word.front}`}
                        onClick={() => void speak(word.front, word.audioUrl)}
                      >
                        <Volume2 className="size-4" />
                      </Button>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground w-1/2">
                  {word.back}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center">
        <Button type="button" size="lg" onClick={onStart} autoFocus>
          Start
        </Button>
      </div>
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
