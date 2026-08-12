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
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [voice, setVoice] = useState<boolean | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Answered | null>(null);
  const [right, setRight] = useState(0);

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
  }, [setIds]);

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

  const question = useMemo(
    () => (word ? buildQuestion(kind, word, data?.pool ?? [], data?.seed ?? "") : null),
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
    setResult(null);
    setIndex((current) => current + 1);
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
    return (
      <Empty
        title="No English voice on this device"
        body="This training reads words aloud, and the browser has no English voice installed. The other trainings work without one."
      />
    );
  }

  if (words.length === 0) {
    return (
      <Empty
        title="No words to practise yet"
        body="Add a few words to your dictionary and they will show up here."
        action={{ href: "/dictionary", label: "Go to my words" }}
      />
    );
  }

  if (index >= words.length) {
    return (
      <Empty
        title={`${right} of ${words.length} right`}
        body={
          right === words.length
            ? "Every word. The ones you got right come back later; the rest come back sooner."
            : "The ones you missed come back sooner than the ones you knew."
        }
        action={{ href: "/practice", label: "Back to trainings" }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-brand-soft text-center text-xs tracking-widest uppercase">
        {title} · {index + 1} of {words.length}
      </p>

      {/* The question stays put once answered — the coloured option beside
          the one you picked is the part worth looking at. */}
      {question && <QuestionView question={question} onAnswered={answer} />}

      {question && result && (
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
  );
}

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
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
      {action && (
        <Button size="lg" render={<Link href={action.href} />}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
