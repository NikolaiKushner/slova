"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Delete, Volume2, X } from "lucide-react";

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
  /**
   * `blocked` means the browser refused to talk without being asked — a press
   * of Play will work. `broken` means it refused that too, and the exercise
   * has to stop being an audio exercise or it cannot be answered at all.
   */
  const [sound, setSound] = useState<"ok" | "blocked" | "broken">("ok");

  // A sound question should be heard without being asked for; a written one
  // should not start talking at somebody.
  useEffect(() => {
    if (question.kind !== "audio-choice" && question.kind !== "listening") return;
    let ignore = false;
    speak(question.speak ?? "", question.audioUrl).then((started) => {
      if (!ignore && !started) setSound("blocked");
    });
    return () => {
      ignore = true;
    };
  }, [question]);

  async function play() {
    const started = await speak(question.speak ?? "", question.audioUrl);
    setSound(started ? "ok" : "broken");
  }

  // A new question is a new component, not the old one told to forget: the
  // previous answer's state cannot leak into it and no effect has to clear it.
  const key = `${question.wordId}-${question.kind}`;

  return (
    <div className="space-y-6">
      <Prompt question={question} sound={sound} onPlay={play} />

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

function Prompt({
  question,
  sound,
  onPlay,
}: {
  question: Question;
  sound: "ok" | "blocked" | "broken";
  onPlay: () => void;
}) {
  const t = useTranslations("practice");
  const hasSound = Boolean(question.speak);
  // Sound is dead and the question showed nothing: without the word on screen
  // there is no exercise left, only a dead end. Show it and let them move on.
  const rescued = sound === "broken" && !question.prompt;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {question.prompt ? (
        <p className="font-display text-3xl">{question.prompt}</p>
      ) : rescued ? (
        <p className="font-display text-3xl">{question.speak}</p>
      ) : (
        <p className="text-brand-soft text-xs tracking-widest uppercase">
          {t("listen")}
        </p>
      )}

      {hasSound && !rescued && (
        <Button
          type="button"
          variant="ghost"
          size={question.prompt ? "sm" : "lg"}
          onClick={onPlay}
          aria-label={t("playWord")}
        >
          <Volume2 className={question.prompt ? "size-4" : "size-6"} />
          {question.prompt ? null : t("play")}
        </Button>
      )}

      {sound === "blocked" && !question.prompt && (
        <p className="text-muted-foreground text-xs">{t("pressPlay")}</p>
      )}

      {rescued && (
        <p className="text-muted-foreground text-xs">{t("noSoundShowWord")}</p>
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

  const choose = useCallback(
    (index: number) => {
      if (chosen !== null) return;
      setChosen(index);
      onAnswered({
        verdict: index === question.answerIndex ? "correct" : "wrong",
        given: question.options[index],
      });
    },
    [chosen, question, onAnswered],
  );

  /**
   * The options are numbered, and the numbers are keys. Four options is few
   * enough to pick blind once the habit forms, and it keeps a whole training
   * on the keyboard — the builder and the typed formats are already there, so
   * reaching for the mouse only here is the odd one out.
   */
  useEffect(() => {
    if (chosen !== null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      if (!Number.isInteger(number)) return;
      if (number < 1 || number > question.options.length) return;

      event.preventDefault();
      choose(number - 1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, chosen, choose]);

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
  );
}

function Builder({
  question,
  onAnswered,
}: {
  question: Extract<Question, { letters: string[] }>;
  onAnswered: (result: Answered) => void;
}) {
  const t = useTranslations("practice");
  const common = useTranslations("common");
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [right, setRight] = useState(false);

  const assembled = picked.map((index) => question.letters[index]).join("");

  const commit = useCallback(
    (next: number[]) => {
      setPicked(next);
      // Checked the moment every tile is used: asking for a separate confirm
      // after the last letter is a click that carries no information.
      if (next.length === question.letters.length) {
        const given = next.map((i) => question.letters[i]).join("");
        const verdict = judge(given, question.answer);
        setDone(true);
        setRight(passed(verdict));
        onAnswered({ verdict, given });
      }
    },
    [question, onAnswered],
  );

  function add(index: number) {
    if (done || picked.includes(index)) return;
    commit([...picked, index]);
  }

  /**
   * The tiles are also a keyboard. Typing a letter takes the leftmost tile
   * bearing it, backspace gives the last one back — which is what anyone who
   * can touch-type will try first, and clicking six tiles with a mouse when
   * your hands are already on the keys is a strange thing to insist on.
   */
  useEffect(() => {
    if (done) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        setPicked(picked.slice(0, -1));
        return;
      }

      if (event.key.length !== 1) return;
      const typed = event.key.toLowerCase();
      const index = question.letters.findIndex(
        (letter, i) => !picked.includes(i) && letter.toLowerCase() === typed,
      );
      if (index === -1) return;

      event.preventDefault();
      commit([...picked, index]);
    }

    // Re-subscribed on every letter so the handler reads the tiles as they are
    // now. Deriving it inside a state updater instead would put `onAnswered`
    // in a place React is allowed to run twice.
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, done, picked, commit]);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex min-h-12 items-center justify-center rounded-lg border border-dashed px-4",
          done ? (right ? "border-primary" : "border-destructive") : "border-border",
        )}
      >
        <span
          className={cn(
            "font-display text-2xl tracking-wide",
            done && (right ? "text-primary" : "text-destructive"),
          )}
        >
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
            aria-label={t("undoLetter")}
          >
            <Delete className="size-4" />
            {common("undo")}
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
  const [right, setRight] = useState(false);
  const t = useTranslations("practice");
  const common = useTranslations("common");

  function submit() {
    if (done || !value.trim()) return;
    const verdict = judge(value, question.answer);
    setDone(true);
    setRight(passed(verdict));
    onAnswered({ verdict, given: value });
  }

  return (
    <div className="mx-auto flex w-full max-w-sm items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={t("typeEnglish")}
        aria-label={t("yourAnswer")}
        disabled={done}
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "h-9 min-w-0 flex-1 text-center text-base",
          done && (right ? "border-primary text-primary" : "border-destructive"),
        )}
      />
      <Button
        type="button"
        size="lg"
        onClick={submit}
        disabled={done || !value.trim()}
        className={done ? "invisible" : undefined}
      >
        {common("check")}
      </Button>
    </div>
  );
}

/**
 * The verdict, under the question rather than instead of it.
 *
 * Next is already on the right, disabled until there is a verdict, so the
 * card does not grow when the answer lands. Correct or Incorrect takes the
 * left of that same row.
 */
export function AnswerFeedback({
  result,
  answer,
  onNext,
}: {
  result: Answered | null;
  answer: string;
  onNext: () => void;
}) {
  const nextRef = useRef<HTMLButtonElement>(null);
  const common = useTranslations("common");
  const right = result ? passed(result.verdict) : false;

  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "flex min-h-9 min-w-0 flex-1 items-center gap-2 text-sm",
            !result
              ? "invisible"
              : result.verdict === "almost"
                ? "text-brand-soft"
                : right
                  ? "text-primary"
                  : "text-destructive",
          )}
          aria-live="polite"
          aria-hidden={!result}
        >
          {right ? (
            <>
              <Check className="size-4 shrink-0" />
              {common("correct")}
            </>
          ) : result?.verdict === "almost" ? (
            <>
              <Check className="size-4 shrink-0" />
              {common("almost")}
            </>
          ) : (
            <>
              <X className="size-4 shrink-0" />
              {common("incorrect")}
            </>
          )}
        </p>
        <Button
          ref={nextRef}
          type="button"
          size="lg"
          disabled={!result}
          onClick={onNext}
        >
          {common("next")}
        </Button>
      </div>
      {result && !right ? (
        <p className="text-muted-foreground text-sm">
          {common.rich("itIs", {
            answer: () => (
              <span className="text-foreground font-medium">{answer}</span>
            ),
          })}
        </p>
      ) : null}
    </div>
  );
}
