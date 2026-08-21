"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";

import { AudioPrompt } from "@/components/practice/audio-prompt";
import { AnswerReveal } from "@/components/slova/answer-reveal";
import { LetterTiles } from "@/components/slova/letter-tiles";
import { OptionButton, OptionList } from "@/components/slova/option-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAutoFocus } from "@/hooks/use-fine-pointer";
import { judge, judgeForms, passed, type Verdict } from "@/lib/practice/answer";
import type { Question } from "@/lib/practice/question";
import { speak } from "@/lib/practice/speech";

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
  onDemandAudioEnabled = false,
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
  onDemandAudioEnabled?: boolean;
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
    const started = await speak(question.speak ?? "", question.audioUrl, {
      onDemand: onDemandAudioEnabled,
    });
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
      onSilent={(source) => setSound(source === "auto" ? "blocked" : "broken")}
      onHeard={() => setSound("ok")}
      onDemandAudioEnabled={onDemandAudioEnabled}
    />
  );

  const answer = part !== "prompt" &&
    ("options" in question ? (
      <Choices key={key} question={question} onAnswered={onAnswered} />
    ) : "letters" in question ? (
      <Builder key={key} question={question} onAnswered={onAnswered} />
    ) : question.kind === "verb-forms" ? (
      <VerbForms key={key} question={question} onAnswered={onAnswered} />
    ) : (
      <Typed key={key} question={question} onAnswered={onAnswered} answered={answered} />
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
  onSilent,
  onHeard,
  onDemandAudioEnabled,
}: {
  question: Question;
  sound: "ok" | "blocked" | "broken";
  onPlay: () => void;
  onSilent: (source: "auto" | "manual") => void;
  onHeard: () => void;
  onDemandAudioEnabled: boolean;
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
      /*
       * No "the browser will not speak on its own" line. §17 rules out
       * apologising for a technical limitation in the interface — the button
       * is the answer — and the line also changed the height of the prompt,
       * which put the options lower on an audio question than on any other.
       */
      <AudioPrompt
        word={question.speak ?? ""}
        audioUrl={question.audioUrl}
        audioSlowUrl={question.audioSlowUrl}
        onSilent={onSilent}
        onHeard={onHeard}
        onDemandAudioEnabled={onDemandAudioEnabled}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {question.prompt ? (
        <p className="font-display text-3xl">{question.prompt}</p>
      ) : (
        <p className="font-display text-3xl">{question.speak}</p>
      )}

      {"caption" in question && question.caption ? (
        <p className="text-muted-foreground text-body-sm">{question.caption}</p>
      ) : null}

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

  /*
   * No key hints here. The screen renders them once, under the footer, where
   * the mockup puts them — drawn here as well they appeared twice and made the
   * answer zone taller on a choice question than on a written one.
   */
  return (
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
  );
}

function Builder({
  question,
  onAnswered,
}: {
  question: Extract<Question, { letters: string[] }>;
  onAnswered: (result: Answered) => void;
}) {
  const [verdict, setVerdict] = useState<"correct" | "incorrect" | null>(null);
  const [built, setBuilt] = useState("");

  /*
   * The tiles, the slots and their keyboard live in LetterTiles now; what
   * stays here is the only part that is about this exercise rather than about
   * letters — judging the guess. `judge` and not a string comparison, because
   * a word one letter out is "almost" and the session treats it as such.
   */
  const complete = useCallback(
    (given: string) => {
      const result = judge(given, question.answer);
      setBuilt(given);
      setVerdict(passed(result) ? "correct" : "incorrect");
      onAnswered({ verdict: result, given });
    },
    [question, onAnswered],
  );

  if (verdict) {
    return (
      <AnswerReveal
        answer={question.answer}
        given={verdict === "correct" ? undefined : built}
        note={question.transcription ?? undefined}
        correct={verdict === "correct"}
        built
      />
    );
  }

  return (
    <LetterTiles
      word={question.answer}
      letters={question.letters}
      verdict={verdict}
      onComplete={complete}
    />
  );
}

function Typed({
  question,
  onAnswered,
  answered,
}: {
  question: Extract<Question, { answer: string; letters?: never }>;
  onAnswered: (result: Answered) => void;
  answered?: boolean;
}) {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [right, setRight] = useState(false);
  const inputRef = useAutoFocus<HTMLInputElement>();
  const t = useTranslations("practice");
  const common = useTranslations("common");

  function submit() {
    if (done || !value.trim()) return;
    const verdict = judge(value, question.answer);
    setDone(true);
    setRight(passed(verdict));
    onAnswered({ verdict, given: value });
  }

  /*
   * Once judged, the field gives way to the word spelled out. Spelling is the
   * entire question in these two formats, so "Incorrect" beside a box still
   * holding the typo asks the learner to diff two strings in their head.
   */
  if (done || answered) {
    return (
      <AnswerReveal
        answer={question.answer}
        given={right ? undefined : value}
        note={[question.transcription, question.kind === "listening" ? question.prompt : null]
          .filter(Boolean)
          .join(" · ")}
        correct={right}
      />
    );
  }

  return (
    /* Mockup: the field is 330 wide with the button beside it. It used to sit
       in a 384px row shared with the button, which left ~250 for the field and
       cut the placeholder in half. */
    <div className="w-full">
      <div className="flex items-center justify-center gap-2.5">
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={question.kind === "listening" ? t("heardWord") : t("typeEnglish")}
          aria-label={t("yourAnswer")}
          enterKeyHint="go"
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
    </div>
  );
}

function VerbForms({
  question,
  onAnswered,
}: {
  question: Extract<Question, { kind: "verb-forms" }>;
  onAnswered: (result: Answered) => void;
}) {
  const [past, setPast] = useState("");
  const [participle, setParticiple] = useState("");
  const [done, setDone] = useState(false);
  const t = useTranslations("practice");
  const common = useTranslations("common");

  function submit() {
    if (done || !past.trim() || !participle.trim()) return;
    const verdict = judgeForms(
      { past, participle },
      {
        past: question.past,
        participle: question.participle,
        acceptPast: question.acceptPast,
      },
    );
    setDone(true);
    onAnswered({ verdict, given: `${past} / ${participle}` });
  }

  if (done) {
    const pastVerdict = fieldVerdict(past, question.past, question.acceptPast);
    const participleVerdict = judge(participle, question.participle);
    return (
      <div className="grid w-full grid-cols-2 gap-3">
        <AnswerReveal
          answer={question.past}
          given={pastVerdict === "correct" ? undefined : past}
          note={t("pastForm")}
          correct={pastVerdict === "correct"}
        />
        <AnswerReveal
          answer={question.participle}
          given={participleVerdict === "correct" ? undefined : participle}
          note={t("participleForm")}
          correct={participleVerdict === "correct"}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="verb-past"
          label={t("pastForm")}
          value={past}
          onChange={setPast}
          onSubmit={submit}
          focusOnMount
        />
        <FormField
          id="verb-participle"
          label={t("participleForm")}
          value={participle}
          onChange={setParticiple}
          onSubmit={submit}
        />
      </div>
      <div className="flex justify-center">
        <Button
          type="button"
          size="lg"
          className="h-[52px]"
          onClick={submit}
          disabled={!past.trim() || !participle.trim()}
        >
          {common("check")}
        </Button>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  onSubmit,
  focusOnMount,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  focusOnMount?: boolean;
}) {
  const inputRef = useAutoFocus<HTMLInputElement>(focusOnMount === true);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-caption justify-center">
        {label}
      </Label>
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        enterKeyHint="go"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="font-display h-[52px] rounded-lg text-center text-[1.0625rem]"
      />
    </div>
  );
}

function fieldVerdict(
  given: string,
  expected: string,
  extras: readonly string[] = [],
): Verdict {
  const verdicts = [expected, ...extras].map((form) => judge(given, form));
  if (verdicts.includes("correct")) return "correct";
  if (verdicts.includes("almost")) return "almost";
  return "wrong";
}
