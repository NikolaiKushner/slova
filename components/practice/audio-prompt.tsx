"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, RotateCcw, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { speak } from "@/lib/practice/speech";
import { cn } from "@/lib/utils";

/** How much slower "Slowly" is. Under about 0.5 the voice stops being speech. */
const SLOW_RATE = 0.6;

/**
 * The prompt for the two formats where the sound *is* the question.
 *
 * A speaker icon the size of a link was the wrong size for the only thing on
 * the screen: on an audio question there is nothing else to press, and it was
 * being hunted for. So it is 96px, in the middle, and it says out loud whether
 * it is speaking — the rings are not decoration but the answer to "did it
 * play?", which is otherwise unanswerable for a thing with no shape.
 *
 * **Again** and **Slowly** exist because a word missed once is missed for two
 * different reasons — not heard, or heard and not caught — and replaying at
 * the same speed only helps with the first.
 */
export function AudioPrompt({
  word,
  audioUrl,
  /** Shown once the answer is in: the word that was being said, and its IPA. */
  reveal,
  transcription,
  onSilent,
  onHeard,
}: {
  word: string;
  audioUrl?: string | null;
  reveal: boolean;
  transcription?: string | null;
  /**
   * Nothing was heard. `auto` is the browser refusing to speak unprompted,
   * which a press of Play fixes; `manual` is it refusing the press too, and
   * that one has no fix left but showing the word.
   */
  onSilent?: (source: "auto" | "manual") => void;
  onHeard?: () => void;
}) {
  const t = useTranslations("practice");
  const [speaking, setSpeaking] = useState(false);

  const say = useCallback(
    async (rate?: number, source: "auto" | "manual" = "manual") => {
      setSpeaking(true);
      const started = await speak(word, audioUrl, {
        rate,
        onEnd: () => setSpeaking(false),
      });
      if (!started) {
        setSpeaking(false);
        onSilent?.(source);
      } else {
        onHeard?.();
      }
    },
    [word, audioUrl, onSilent, onHeard],
  );

  /**
   * Said once, on arrival, without being asked — the sound *is* the question,
   * and making somebody press Play to be asked it is a click per word. The
   * browser is allowed to refuse, which is what `onSilent("auto")` reports.
   */
  useEffect(() => {
    // A beat, so the question is on screen before the voice starts: a word
    // said into a page that is still arriving is a word said to nobody.
    const timer = setTimeout(() => void say(undefined, "auto"), 220);
    return () => clearTimeout(timer);
    // Deliberately keyed on the word alone: `say` changes identity with every
    // callback prop, and re-speaking on a parent render would talk over itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  /**
   * Space replays. It is caught here rather than left to the focused button
   * because after answering the focus is on Next, where Space would advance
   * the question instead of repeating the word — and repeating the word is
   * what a listening drill is for.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Not while typing an answer — there, space is a space.
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      event.preventDefault();
      void say();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [say]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => void say()}
        aria-label={t("playWord")}
        data-speaking={speaking}
        className={cn(
          "sound-ring bg-card text-primary relative size-24 rounded-full shadow-sm",
          "hover:bg-card hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
        )}
      >
        <Volume2 className="size-8" aria-hidden />
      </Button>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void say()}
        >
          <RotateCcw className="size-3.5" />
          {t("playAgain")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void say(SLOW_RATE)}
        >
          <Clock className="size-3.5" />
          {t("playSlowly")}
        </Button>
      </div>

      {/*
        The word appears only with the verdict. Kept in the layout at all times
        — `invisible`, not unmounted — so the options do not jump down the
        screen at the moment somebody is reading which one was right.
      */}
      <div className={cn("text-center", reveal ? "visible" : "invisible")}>
        <p className="font-display text-4xl leading-tight">{word}</p>
        <p className="text-muted-foreground min-h-5 text-sm">
          {transcription ?? ""}
        </p>
      </div>
    </div>
  );
}
