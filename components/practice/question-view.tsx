"use client";

import { useEffect, useState } from "react";
import { Delete, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { judge, passed, type Verdict } from "@/lib/practice/answer";
import type { Question } from "@/lib/practice/question";
import { speak } from "@/lib/practice/speech";
import { cn } from "@/lib/utils";

/**
 * One question, whichever format it is.
 *
 * The formats differ in what they show and what they take, so they get their
 * own small components — but the answer leaves through one door: `onAnswered`
 * with a verdict. Everything above this (a single training, or Brainstorm's
 * ladder) only ever needs to know right or wrong, which is what keeps the
 * queue a pure function and this file the only place any of it is drawn.
 */

export type Answered = { verdict: Verdict; given: string };

export function QuestionView({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered: (result: Answered) => void;
}) {
  // A sound question should be heard without being asked for; a written one
  // should not start talking at somebody.
  useEffect(() => {
    if (question.kind === "audio-choice" || question.kind === "listening") {
      speak(question.speak ?? "");
    }
  }, [question]);

  // A new question is a new component, not the old one told to forget: the
  // previous answer's state cannot leak into it and no effect has to clear it.
  const key = `${question.wordId}-${question.kind}`;

  return (
    <div className="space-y-6">
      <Prompt question={question} />

      {"options" in question ? (
        <Choices key={key} question={question} onAnswered={onAnswered} />
      ) : "letters" in question ? (
        <Builder key={key} question={question} onAnswered={onAnswered} />
      ) : (
        <Typed key={key} question={question} onAnswered={onAnswered} />
      )}
    </div>
  );
}

function Prompt({ question }: { question: Question }) {
  const hasSound = Boolean(question.speak);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {question.prompt ? (
        <p className="font-display text-3xl">{question.prompt}</p>
      ) : (
        <p className="text-brand-soft text-xs tracking-widest uppercase">
          Listen
        </p>
      )}

      {hasSound && (
        <Button
          type="button"
          variant="ghost"
          size={question.prompt ? "sm" : "lg"}
          onClick={() => speak(question.speak ?? "")}
          aria-label="Play the word again"
        >
          <Volume2 className={question.prompt ? "size-4" : "size-6"} />
          {question.prompt ? null : "Play again"}
        </Button>
      )}
    </div>
  );
}

function Choices({
  question,
  onAnswered,
}: {
  question: Extract<Question, { options: string[] }>;
  onAnswered: (result: Answered) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);

  function choose(index: number) {
    if (chosen !== null) return;
    setChosen(index);
    onAnswered({
      verdict: index === question.answerIndex ? "correct" : "wrong",
      given: question.options[index],
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {question.options.map((option, index) => (
        <Button
          key={option}
          type="button"
          variant="outline"
          size="lg"
          className={cn(
            "h-auto justify-start py-3 text-base whitespace-normal",
            chosen !== null &&
              index === question.answerIndex &&
              "border-primary text-primary",
            chosen === index &&
              index !== question.answerIndex &&
              "border-destructive text-destructive",
          )}
          disabled={chosen !== null && index !== chosen && index !== question.answerIndex}
          onClick={() => choose(index)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

function Builder({
  question,
  onAnswered,
}: {
  question: Extract<Question, { letters: string[] }>;
  onAnswered: (result: Answered) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const assembled = picked.map((index) => question.letters[index]).join("");

  function add(index: number) {
    if (done || picked.includes(index)) return;
    const next = [...picked, index];
    setPicked(next);

    // Checked the moment every tile is used: asking for a separate confirm
    // after the last letter is a click that carries no information.
    if (next.length === question.letters.length) {
      setDone(true);
      const given = next.map((i) => question.letters[i]).join("");
      onAnswered({ verdict: judge(given, question.answer), given });
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-border flex min-h-12 items-center justify-center rounded-lg border border-dashed px-4">
        <span className="font-display text-2xl tracking-wide">
          {assembled || <span className="text-muted-foreground text-base">…</span>}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {question.letters.map((letter, index) => (
          <Button
            key={`${letter}-${index}`}
            type="button"
            variant="outline"
            size="lg"
            className="min-w-11 font-mono text-base"
            disabled={picked.includes(index) || done}
            onClick={() => add(index)}
          >
            {letter === " " ? "␣" : letter}
          </Button>
        ))}
      </div>

      {picked.length > 0 && !done && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPicked(picked.slice(0, -1))}
          >
            <Delete className="size-4" />
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

function Typed({
  question,
  onAnswered,
}: {
  question: Extract<Question, { answer: string; letters?: never }>;
  onAnswered: (result: Answered) => void;
}) {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    if (done || !value.trim()) return;
    setDone(true);
    onAnswered({ verdict: judge(value, question.answer), given: value });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Type the English word"
        aria-label="Your answer"
        disabled={done}
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="max-w-sm text-center text-base"
      />
      <Button type="button" size="lg" onClick={submit} disabled={done || !value.trim()}>
        Check
      </Button>
    </div>
  );
}

/** Shown after an answer: what was right, and how close the attempt was. */
export function AnswerFeedback({
  result,
  answer,
  onNext,
}: {
  result: Answered;
  answer: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {result.verdict === "correct" ? (
        <p className="text-primary text-sm">Correct</p>
      ) : result.verdict === "almost" ? (
        <p className="text-brand-soft text-sm">
          Almost — it is <span className="font-medium">{answer}</span>
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          It is <span className="text-foreground font-medium">{answer}</span>
        </p>
      )}

      <Button type="button" size="lg" onClick={onNext} autoFocus>
        {passed(result.verdict) ? "Next" : "Got it"}
      </Button>
    </div>
  );
}
