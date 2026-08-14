"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import type { Exercise, Rule } from "@/content/courses/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gradeExercise, type GrammarVerdict } from "@/lib/courses/answer";
import { mdToNodes } from "@/lib/courses/md";
import { cn } from "@/lib/utils";

export type GrammarAnswered = { verdict: GrammarVerdict; given: string };

export function ExerciseView({
  exercise,
  onAnswered,
}: {
  exercise: Exercise;
  onAnswered: (result: GrammarAnswered) => void;
}) {
  if (exercise.kind === "choice" || exercise.kind === "pick-sentence") {
    return <Choices exercise={exercise} onAnswered={onAnswered} />;
  }
  return <Typed exercise={exercise} onAnswered={onAnswered} />;
}

function Choices({
  exercise,
  onAnswered,
}: {
  exercise: Extract<Exercise, { options: string[] }>;
  onAnswered: (result: GrammarAnswered) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);

  const choose = useCallback(
    (index: number) => {
      if (chosen !== null) return;
      const given = exercise.options[index];
      if (given === undefined) return;
      setChosen(index);
      onAnswered({
        verdict: gradeExercise(exercise, given),
        given,
      });
    },
    [chosen, exercise, onAnswered],
  );

  useEffect(() => {
    if (chosen !== null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      if (!Number.isInteger(number)) return;
      if (number < 1 || number > exercise.options.length) return;
      event.preventDefault();
      choose(number - 1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exercise, chosen, choose]);

  const answerIndex = exercise.options.indexOf(exercise.answer);

  return (
    <div className="space-y-4">
      <Prompt exercise={exercise} />
      <div className="grid gap-2 sm:grid-cols-2">
        {exercise.options.map((option, index) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            size="lg"
            className={cn(
              "h-auto justify-start py-3 text-base whitespace-normal",
              chosen !== null &&
                index === answerIndex &&
                "border-primary text-primary",
              chosen === index &&
                index !== answerIndex &&
                "border-destructive text-destructive",
            )}
            disabled={
              chosen !== null && index !== chosen && index !== answerIndex
            }
            onClick={() => choose(index)}
          >
            <span
              aria-hidden
              className="text-muted-foreground border-border mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md border text-xs"
            >
              {index + 1}
            </span>
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Typed({
  exercise,
  onAnswered,
}: {
  exercise: Extract<Exercise, { kind: "gap" | "transform" }>;
  onAnswered: (result: GrammarAnswered) => void;
}) {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [right, setRight] = useState(false);

  function submit() {
    if (done || !value.trim()) return;
    const verdict = gradeExercise(exercise, value);
    setDone(true);
    setRight(verdict === "correct");
    onAnswered({ verdict, given: value });
  }

  return (
    <div className="space-y-4">
      <Prompt exercise={exercise} />
      <div className="flex flex-col items-stretch gap-3 sm:items-center">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={exercise.kind === "transform" ? "Type the new sentence" : "Type the form"}
          aria-label="Your answer"
          disabled={done}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "max-w-md text-center text-base",
            done && (right ? "border-primary text-primary" : "border-destructive"),
          )}
        />
        {!done && (
          <Button type="button" size="lg" onClick={submit} disabled={!value.trim()}>
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

function Prompt({ exercise }: { exercise: Exercise }) {
  return (
    <div className="space-y-2">
      {"source" in exercise ? (
        <p className="font-display text-2xl leading-snug">{exercise.source}</p>
      ) : null}
      <p
        className={
          "source" in exercise
            ? "text-muted-foreground"
            : "font-display text-2xl leading-snug"
        }
      >
        {exercise.prompt}
      </p>
    </div>
  );
}

export function GrammarFeedback({
  result,
  answer,
  rule,
  onNext,
}: {
  result: GrammarAnswered;
  answer: string;
  rule: Rule | undefined;
  onNext: () => void;
}) {
  const right = result.verdict === "correct";

  return (
    <div className="flex flex-col gap-3">
      <p
        className={cn(
          "flex items-center gap-2 text-sm",
          right ? "text-primary" : "text-destructive",
        )}
      >
        {right ? (
          <Check className="size-4 shrink-0" />
        ) : (
          <X className="size-4 shrink-0" />
        )}
        {right ? (
          "Correct"
        ) : (
          <span>
            It is <span className="font-medium">{answer}</span>
          </span>
        )}
      </p>
      {!right && rule ? (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {mdToNodes(rule.anchorMd)}
        </p>
      ) : null}
      <div>
        <Button type="button" size="lg" onClick={onNext} autoFocus>
          Next
        </Button>
      </div>
    </div>
  );
}
