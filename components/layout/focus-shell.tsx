"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The focus mode from §15.2 — drills, brainstorm, lesson practice.
 *
 * Its whole reason to exist is principle §1.4: the screen must not jump. Every
 * zone below holds its height whether or not it has anything in it, so
 * changing the question format changes the contents and never the geometry.
 * The answer options therefore start on the same line in all seven formats,
 * which is the thing the product gets wrong today.
 *
 * Not yet wired into the running drills: moving practice-session, brainstorm
 * and the lesson exercise onto it is step 5.1, where the question screen is
 * rebuilt against it as the reference implementation.
 */

/** Sticky top bar: exit on the left, progress in the middle, tally on the right. */
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
        "scrim-panel sticky top-0 z-20 flex min-h-14 shrink-0 items-center gap-4 border-b border-border px-5 md:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">{leading}</div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        {progress}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {trailing}
      </div>
    </header>
  );
}

/**
 * The prompt. Fixed at 186px: a word, a sentence and a play button are wildly
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
        "flex h-[186px] shrink-0 flex-col items-center justify-center gap-3 text-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The answer area — at least 240px, always starting on the same line. */
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
      className={cn("flex min-h-60 flex-col gap-2", className)}
    >
      {children}
    </div>
  );
}

/**
 * The verdict line. 44px whether or not anything is in it, so the reaction
 * appearing does not shove the options up the screen.
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
      aria-live="polite"
      className={cn("flex h-11 shrink-0 items-center", className)}
    >
      {children}
    </div>
  );
}

/**
 * Wraps the three zones. Sets `data-drill` on the body, which is what dims the
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
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {topBar}
      <div className="flex flex-1 items-center justify-center px-5 py-8 md:px-8">
        <div className="container-focus flex w-full flex-col gap-6">
          {children}
        </div>
      </div>
    </div>
  );
}
