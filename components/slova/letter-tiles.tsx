"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { tilesOf } from "@/lib/practice/question";
import { cn } from "@/lib/utils";

/**
 * "Assemble the word" — §14. A phrase is the same component with word tiles
 * instead of letters: `give up` deals two tiles, never seven.
 *
 * Slots along the top, one per tile; shuffled tiles below. Checking happens
 * by itself when the last slot fills, so there is no button to hunt for, and
 * Backspace returns the last tile to the pile.
 *
 * The answer is spelled out in the slots when the guess is wrong. Being told
 * "incorrect" and not shown the spelling teaches nothing, and this is the rung
 * where spelling is the whole point.
 */
export function LetterTiles({
  word,
  letters: given,
  verdict,
  onComplete,
  className,
}: {
  word: string;
  /**
   * The tiles to offer. Questions arrive with their tiles already shuffled
   * against the session seed, and reshuffling them here would undo that.
   */
  letters?: string[];
  /** Set by the parent once judged; locks the tiles and colours the slots. */
  verdict?: "correct" | "incorrect" | null;
  onComplete: (guess: string) => void;
  className?: string;
}) {
  const units = useMemo(() => tilesOf(word), [word]);
  const phrase = units.some((tile) => tile.length > 1);
  const join = phrase ? " " : "";
  const letters = useMemo(
    () => given ?? shuffle(units, word),
    [given, units, word],
  );

  // Which tile index sits in each slot; null means the slot is empty.
  const [placed, setPlaced] = useState<(number | null)[]>(() =>
    units.map(() => null),
  );

  /*
   * Clearing the slots when the word changes is a state adjustment during
   * render, not an effect. Done in an effect it would paint the previous
   * word's letters for one frame first, and `react-hooks/set-state-in-effect`
   * is right to object.
   */
  const [builtFor, setBuiltFor] = useState(word);
  if (builtFor !== word) {
    setBuiltFor(word);
    setPlaced(units.map(() => null));
  }

  const locked = verdict != null;

  const place = useCallback(
    (tile: number) => {
      if (locked) return;
      setPlaced((slots) => {
        if (slots.includes(tile)) return slots;
        const free = slots.indexOf(null);
        if (free === -1) return slots;
        const next = [...slots];
        next[free] = tile;
        if (next.every((slot) => slot !== null)) {
          const guess = next.map((slot) => letters[slot!]).join(join);
          // Deferred: firing during the state update would have the parent
          // re-render this component from inside its own setState.
          queueMicrotask(() => onComplete(guess));
        }
        return next;
      });
    },
    [join, letters, locked, onComplete],
  );

  const takeBack = useCallback(() => {
    if (locked) return;
    setPlaced((slots) => {
      const last = slots.findLastIndex((slot) => slot !== null);
      if (last === -1) return slots;
      const next = [...slots];
      next[last] = null;
      return next;
    });
  }, [locked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (locked) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        takeBack();
        return;
      }
      if (event.key.length !== 1) return;
      const pressed = event.key.toLowerCase();
      const tile = letters.findIndex((letter, index) => {
        if (placed.includes(index)) return false;
        const value = letter.toLowerCase();
        return phrase ? value.startsWith(pressed) : value === pressed;
      });
      if (tile !== -1) place(tile);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [letters, locked, phrase, place, placed, takeBack]);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap justify-center gap-1.5">
        {placed.map((tile, slot) => {
          const shown =
            verdict === "incorrect" ? units[slot] : tile === null ? "" : letters[tile];
          return (
            <span
              key={slot}
              className={cn(
                "font-display flex h-12 items-center justify-center border-b-2 text-[1.625rem] transition-colors coarse:h-[52px]",
                phrase ? "min-w-14 px-1.5" : "w-10 coarse:w-11",
                verdict === "correct"
                  ? "border-success text-success"
                  : verdict === "incorrect"
                    ? "border-destructive text-destructive"
                    : tile !== null
                      ? "border-ring text-foreground"
                      : "border-input text-foreground",
              )}
            >
              {shown}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((letter, tile) => (
          <button
            key={tile}
            type="button"
            lang="en"
            disabled={locked || placed.includes(tile)}
            onClick={() => place(tile)}
            className={cn(
              "focus-ring font-display border-border bg-card h-11 rounded-md border px-2 text-xl transition-all hover:-translate-y-0.5 hover:border-ring disabled:pointer-events-none disabled:opacity-25",
              phrase ? "min-w-11 px-3" : "letter-tile min-w-11",
            )}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Seeded by the word so the tiles do not reshuffle on every render — and so
 * the same word on a later rung is not handed back in the order just learned.
 */
function shuffle(items: string[], seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) % 2147483647;
    const j = hash % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
