"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Volume2, X } from "lucide-react";

import { AudioPrompt } from "@/components/practice/audio-prompt";
import { KeyHints } from "@/components/slova/key-hints";
import { LetterTiles } from "@/components/slova/letter-tiles";
import { OptionButton, OptionList } from "@/components/slova/option-button";
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
  answered = false,
  part = "all",
}: {
  question: Question;
  onAnswered: (result: Answered) => void;
  /** The verdict is in. Audio formats use it to reveal the word they hid. */
  answered?: boolean;
  /**
   * Which half to draw. §15.2 puts the prompt in a zone of fixed height and
   * the answer in another, so that changing format changes the contents and
   * not the geometry — and the two zones are not siblings in the tree. A
   * screen on FocusShell therefore renders this twice, once for each half.
   * Everything else asks for "all" and gets both, as before.
   */
  part?: "all" | "prompt" | "answer";
}) {
  /**
   * `blocked` means the browser refused to talk without being asked — a press
   * of Play will work. `broken` means it refused that too, and the exercise
   * has to stop being an audio exercise or it cannot be answered at all.
   */
  const [sound, setSound] = useState<"ok" | "blocked" | "broken">("ok");

  /*
   * The two sound formats no longer autoplay from here — `AudioPrompt` owns
   * their sound end to end, so that the button it is played from is also the
   * thing that shows it playing. Two owners meant the word was said twice.
   * The written formats never spoke on arrival and still do not.
   */

  async function play() {
    const started = await speak(question.speak ?? "", question.audioUrl);
    setSound(started ? "ok" : "broken");
  }

  // A new question is a new component, not the old one told to forget: the
  // previous answer's state cannot leak into it and no effect has to clear it.
  const key = `${question.wordId}-${question.kind}`;

  const prompt = part !== "answer" && (
    <Prompt
      question={question}
      sound={sound}
      onPlay={play}
      answered={answered}
      onSilent={(source) => setSound(source === "auto" ? "blocked" : "broken")}
      onHeard={() => setSound("ok")}
    />
  );

  const answer = part !== "prompt" &&
    ("options" in question ? (
      <Choices key={key} question={question} onAnswered={onAnswered} />
    ) : "letters" in question ? (
      <Builder key={key} question={question} onAnswered={onAnswered} />
    ) : (
      <Typed key={key} question={question} onAnswered={onAnswered} />
    ));

  if (part !== "all") return <>{prompt || answer}</>;

  return (
    <div className="space-y-6">
      {prompt}
      {answer}
    </div>
  );
}

function Prompt({
  question,
  sound,
  onPlay,
  answered,
  onSilent,
  onHeard,
}: {
  question: Question;
  sound: "ok" | "blocked" | "broken";
  onPlay: () => void;
  answered: boolean;
  onSilent: (source: "auto" | "manual") => void;
  onHeard: () => void;
}) {
  const t = useTranslations("practice");
  const hasSound = Boolean(question.speak);
  // Sound is dead and the question showed nothing: without the word on screen
  // there is no exercise left, only a dead end. Show it and let them move on.
  const rescued = sound === "broken" && !question.prompt;

  /*
   * Two shapes of prompt, and which one you get is decided by the format, not
   * by taste. When the sound is the question there is nothing else on screen,
   * so it gets the big button. When the word or its translation is written up
   * there, sound is a second opinion about something already visible, and a
   * small speaker beside it is the right weight.
   */
  if (!question.prompt && hasSound && !rescued) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AudioPrompt
          word={question.speak ?? ""}
          audioUrl={question.audioUrl}
          transcription={question.transcription}
          reveal={answered}
          onSilent={onSilent}
          onHeard={onHeard}
        />
        {sound === "blocked" ? (
          <p className="text-muted-foreground text-xs">{t("pressPlay")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {question.prompt ? (
        <p className="font-display text-3xl">{question.prompt}</p>
      ) : (
        <p className="font-display text-3xl">{question.speak}</p>
      )}

      {hasSound && !rescued && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onPlay}
          aria-label={t("playWord")}
        >
          <Volume2 className="size-4" />
        </Button>
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

  const t = useTranslations("practice");
  const withSound = question.kind === "audio-choice";

  return (
    <div className="space-y-5">
      <OptionList>
        {question.options.map((option, index) => {
          const isAnswer = index === question.answerIndex;
          const decided = chosen !== null;

          return (
            <li key={option}>
              <OptionButton
                index={index}
                disabled={decided}
                onClick={() => choose(index)}
                /*
                 * A disabled control is normally faded, but here the verdict is
                 * the whole point of the screen: the two answered states keep
                 * full contrast and only the bystanders step back.
                 */
                state={
                  !decided
                    ? "idle"
                    : isAnswer
                      ? "correct"
                      : chosen === index
                        ? "incorrect"
                        : "dimmed"
                }
              >
                {option}
              </OptionButton>
            </li>
          );
        })}
      </OptionList>

      <KeyHints
        hints={[
          { keys: ["1", String(question.options.length)], label: t("hintPick") },
          ...(withSound
            ? [{ keys: [t("keySpace")], label: t("hintRepeat") }]
            : []),
          { keys: [t("keyEnter")], label: t("hintNext") },
        ]}
      />
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
  const [verdict, setVerdict] = useState<"correct" | "incorrect" | null>(null);

  /*
   * The tiles, the slots and their keyboard live in LetterTiles now; what
   * stays here is the only part that is about this exercise rather than about
   * letters — judging the guess. `judge` and not a string comparison, because
   * a word one letter out is "почти" and the session treats it as such.
   */
  const complete = useCallback(
    (given: string) => {
      const result = judge(given, question.answer);
      setVerdict(passed(result) ? "correct" : "incorrect");
      onAnswered({ verdict: result, given });
    },
    [question, onAnswered],
  );

  return (
    <div className="space-y-6">
      <LetterTiles
        word={question.answer}
        letters={question.letters}
        verdict={verdict}
        onComplete={complete}
      />

      <KeyHints
        className="justify-center"
        hints={[
          { keys: [], label: t("hintTypeLetters") },
          { keys: [t("keyBackspace")], label: t("hintTakeBack") },
          { keys: [t("keyEnter")], label: t("hintNext") },
        ]}
      />
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
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="flex items-center gap-2">
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
            done &&
              (right ? "border-primary text-primary" : "border-destructive"),
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

      <KeyHints
        className="justify-center"
        hints={[
          {
            keys: [t("keyEnter")],
            label: done ? t("hintNext") : t("hintCheck"),
          },
        ]}
      />
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
