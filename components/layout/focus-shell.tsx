"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The focus mode from §15.2 — drills, brainstorm, lesson practice.
 *
 * Its whole reason to exist is principle §1.4: the screen must not jump. Every
 * zone below holds its height whether or not it has anything in it, so
 * changing the question format changes the contents and never the geometry.
 * The answer options therefore start on the same line in all seven formats.
 *
 * Heights come from the drill mockup: prompt 150, answer 158, footer 52.
 */

/**
 * The session bar — one bar for every session, brainstorm or single format.
 *
 * Three slots with the sides pinned to the same width, so whatever sits in the
 * middle is centred against the screen rather than against whatever happens to
 * be to its left. Brainstorm puts the ladder there, a single format puts a
 * progress bar; that is the only difference between them.
 */
export function FocusTopBar({
  leading,
  progress,
  trailing,
  className,
}: {
  leading?: React.ReactNode;
  progress?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "scrim-panel border-border sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-6 border-b px-4 md:px-8",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 sm:min-w-[150px]">
        {leading}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        {progress}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3.5 text-right sm:min-w-[150px]">
        {trailing}
      </div>
    </header>
  );
}

/**
 * How far through a single-format session — a filled track and a count.
 *
 * A proportion is right here and wrong in brainstorm: this session has a known
 * length and ends when it runs out, while brainstorm ends when every word is
 * learned. Showing a percentage there would turn it into a number to push.
 */
export function LinearProgress({
  current,
  total,
  label,
}: {
  /** 1-based — it reads like the question number it is. */
  current: number;
  total: number;
  label: string;
}) {
  const done = Math.max(0, Math.min(current - 1, total));

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-1.5">
      <div
        className="bg-data-track h-[5px] overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={label}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-(--motion-slow) ease-(--ease-emphasized)"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>
      <p className="text-disabled-foreground text-center text-xs tabular-nums">
        {label}
      </p>
    </div>
  );
}

/** The task name and where you are — the two lines above every question. */
export function FocusHead({
  task,
  step,
}: {
  task: string;
  step?: React.ReactNode;
}) {
  return (
    <header className="mb-5 text-center">
      <p className="text-overline text-eyebrow">{task}</p>
      {step ? (
        <p className="text-disabled-foreground mt-1.5 text-caption tabular-nums">
          {step}
        </p>
      ) : null}
    </header>
  );
}

/**
 * The prompt. Fixed at 150px: a word, a sentence and a play button are wildly
 * different shapes, and letting them size the box is what moves everything
 * underneath them.
 */
export function FocusPrompt({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="focus-prompt"
      className={cn(
        "flex min-h-[150px] shrink-0 flex-col items-center justify-center gap-3.5 text-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The answer area — a fixed height, so it always starts on the same line.
 *
 * The mockup says `min-height: 158px`, and that number cannot hold what it is
 * asked to: four options at 52px with 8px between them are 232. Under a
 * vertically centred scene the shorter written formats then re-centre and the
 * options land 60px lower on one question than on the last — which is the
 * exact thing §15.2 exists to forbid, in a session that changes format every
 * word. So the zone is 232: tall enough for the tallest format, identical for
 * all of them, and the footer under it does not move either.
 */
export function FocusAnswer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="focus-answer"
      className={cn(
        "mt-5 flex min-h-[232px] flex-col justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The verdict line, and the way on. 52px whether or not anything is in it, so
 * the reaction appearing does not shove the answer up the screen.
 */
export function FocusFooter({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="focus-footer"
      className={cn(
        "mt-5 flex min-h-[52px] items-center justify-between gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Wraps the zones. Sets `data-drill` on the body, which is what dims the
 * sidebar to 0.4 on the desktop (globals.css) and what hides it on touch.
 */
export function FocusShell({
  topBar,
  className,
  children,
}: {
  topBar?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    document.body.dataset.drill = "on";
    return () => {
      delete document.body.dataset.drill;
    };
  }, []);

  return (
    /*
     * Bleeds out of the page padding AppShell applies, so the sticky bar runs
     * edge to edge across the content area instead of floating inside a
     * margin. Cancels --page-* rather than repeating the numbers.
     */
    <div
      className={cn(
        "-mx-(--page-px) -mt-(--page-pt) -mb-(--page-pb) flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      {topBar}
      {/* The scene is centred in whatever height is left under the bar. */}
      <div className="flex flex-1 items-center justify-center px-4 pt-8 pb-18 md:px-8">
        <div className="container-focus w-full">{children}</div>
      </div>
    </div>
  );
}
