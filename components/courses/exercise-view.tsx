"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { Exercise } from "@/content/courses/schema";
import { AnswerReveal } from "@/components/slova/answer-reveal";
import { OptionButton, OptionList } from "@/components/slova/option-button";
import { SpeakButton } from "@/components/slova/speak-button";
import { TokenMark } from "@/components/slova/token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gradeExercise, type GrammarVerdict } from "@/lib/courses/answer";
import { resolveCourseAudio } from "@/lib/courses/audio";
import { endingAgainst, gapCue, splitGapPrompt } from "@/lib/courses/prompt";
import { speakText } from "@/lib/courses/speak-text";
import { cn } from "@/lib/utils";

export type GrammarAnswered = { verdict: GrammarVerdict; given: string };

/**
 * One grammar question, in the same two zones a training uses.
 *
 * Choice and pick-sentence go through OptionButton. A gap in the prompt is
 * drawn as an underline and filled after the answer — the mockup's shape,
 * not a second widget.
 */
export function GrammarQuestion({
  exercise,
  answered,
  onAnswered,
  part,
}: {
  exercise: Exercise;
  answered: GrammarAnswered | null;
  onAnswered: (result: GrammarAnswered) => void;
  part: "prompt" | "answer";
}) {
  if (part === "prompt") {
    return <Prompt exercise={exercise} answered={answered} />;
  }
  if (exercise.kind === "choice" || exercise.kind === "pick-sentence") {
    return <Choices exercise={exercise} answered={answered} onAnswered={onAnswered} />;
  }
  return <Typed exercise={exercise} answered={answered} onAnswered={onAnswered} />;
}

/**
 * The line above the question. A gap can override it: "type the form" does not
 * say that `I ___ football.` wants a negative, and no cue can say it either.
 */
export function taskKey(
  exercise: Exercise,
):
  | "taskChoice"
  | "taskPick"
  | "taskGap"
  | "taskGapNegative"
  | "taskGapQuestion"
  | "taskTransform" {
  switch (exercise.kind) {
    case "choice":
      return "taskChoice";
    case "pick-sentence":
      return "taskPick";
    case "gap":
      return exercise.task === "negative"
        ? "taskGapNegative"
        : exercise.task === "question"
          ? "taskGapQuestion"
          : "taskGap";
    case "transform":
      return "taskTransform";
  }
}

function Prompt({
  exercise,
  answered,
}: {
  exercise: Exercise;
  answered: GrammarAnswered | null;
}) {
  if (exercise.kind === "transform") {
    const text = speakText(exercise.source);
    const audio = resolveCourseAudio(text);

    return (
      <div className="flex items-start justify-center gap-3">
        <p
          lang="en"
          className="font-display min-w-0 text-[2rem] leading-snug font-medium"
        >
          {exercise.source}
        </p>
        <SpeakButton
          text={text}
          normalUrl={audio?.normalUrl}
          slowUrl={audio?.slowUrl}
        />
      </div>
    );
  }

  if (exercise.kind === "pick-sentence") {
    return null;
  }

  const gap = splitGapPrompt(exercise.prompt);
  if (!gap.hasGap) {
    return (
      <p lang="en" className="font-display text-[2rem] leading-snug font-medium">
        {exercise.prompt}
      </p>
    );
  }

  const fill =
    answered === null
      ? null
      : exercise.kind === "choice"
        ? filledForm(exercise.answer, exercise.options)
        : filledForm(exercise.answer, gap.hint ? [gap.hint] : []);

  return (
    <>
      <p lang="en" className="font-display text-[2rem] leading-snug font-medium">
        {gap.before}
        <span
          className={cn(
            "inline-block min-w-[110px] border-b-2 text-center align-baseline transition-colors duration-(--motion-fast)",
            fill ? "border-success text-success" : "border-input",
          )}
        >
          {fill ?? "\u00a0"}
        </span>
        {gap.after}
      </p>
      {exercise.kind === "gap" ? <FormCue exercise={exercise} /> : null}
    </>
  );
}

/**
 * The word the blank is a form of, under the sentence.
 *
 * Beside the prompt rather than inside the input: a placeholder reads as the
 * thing to type, and it disappears the moment anything is typed \u2014 exactly when
 * a person is checking what they were asked for. Small and quiet, because it is
 * the question's footnote, not a hint.
 */
function FormCue({
  exercise,
}: {
  exercise: Extract<Exercise, { kind: "gap" }>;
}) {
  const t = useTranslations("courses");
  const cue = gapCue(exercise);
  if (!cue) return null;

  return (
    <p className="text-muted-foreground text-caption">
      {t("formCue")}:{" "}
      <span lang="en" className="text-foreground font-medium">
        {cue}
      </span>
    </p>
  );
}

/** Always the right form: the options carry the miss, the gap does not. */
function filledForm(answer: string, others: readonly string[]): React.ReactNode {
  const ending = endingAgainst(answer, others);
  if (!ending) return answer;
  return (
    <>
      {ending.stem}
      <TokenMark>{ending.ending}</TokenMark>
    </>
  );
}

function Choices({
  exercise,
  answered,
  onAnswered,
}: {
  exercise: Extract<Exercise, { options: string[] }>;
  answered: GrammarAnswered | null;
  onAnswered: (result: GrammarAnswered) => void;
}) {
  const choose = useCallback(
    (index: number) => {
      if (answered) return;
      const given = exercise.options[index];
      if (given === undefined) return;
      onAnswered({
        verdict: gradeExercise(exercise, given),
        given,
      });
    },
    [answered, exercise, onAnswered],
  );

  useEffect(() => {
    if (answered) return;

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
  }, [exercise, answered, choose]);

  return (
    <OptionList>
      {exercise.options.map((option, index) => {
        const isAnswer = option === exercise.answer;
        const decided = answered !== null;
        const chosen = decided && answered.given === option;

        return (
          <li key={option}>
            <OptionButton
              index={index}
              disabled={decided}
              onClick={() => choose(index)}
              state={
                !decided
                  ? "idle"
                  : isAnswer
                    ? "correct"
                    : chosen
                      ? "incorrect"
                      : "dimmed"
              }
            >
              <span lang="en">{option}</span>
            </OptionButton>
          </li>
        );
      })}
    </OptionList>
  );
}

function Typed({
  exercise,
  answered,
  onAnswered,
}: {
  exercise: Extract<Exercise, { kind: "gap" | "transform" }>;
  answered: GrammarAnswered | null;
  onAnswered: (result: GrammarAnswered) => void;
}) {
  const [value, setValue] = useState("");
  const t = useTranslations("courses");
  const practice = useTranslations("practice");
  const common = useTranslations("common");

  function submit() {
    if (answered || !value.trim()) return;
    onAnswered({
      verdict: gradeExercise(exercise, value),
      given: value,
    });
  }

  if (answered) {
    if (exercise.kind === "gap") {
      return null;
    }
    return (
      <AnswerReveal
        answer={exercise.answer}
        given={answered.verdict === "correct" ? undefined : answered.given}
        correct={answered.verdict === "correct"}
      />
    );
  }

  return (
    <div className="flex items-center justify-center gap-2.5">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={
          exercise.kind === "transform" ? t("typeSentence") : t("typeForm")
        }
        aria-label={practice("yourAnswer")}
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="font-display h-[52px] min-w-0 max-w-[330px] flex-1 rounded-lg text-center text-[1.0625rem] placeholder:font-sans placeholder:text-body-sm"
      />
      <Button
        type="button"
        size="lg"
        className="h-[52px]"
        onClick={submit}
        disabled={!value.trim()}
      >
        {common("check")}
      </Button>
    </div>
  );
}
