/**
 * One sitting: a visit to a training or a lesson, not each review.
 *
 * Duration is lastAt − startedAt, so the summary screen and a cup of tea
 * after the last answer do not inflate the hours that will someday show
 * on the dashboard. A sitting with no patch for three hours closes at
 * lastAt as abandoned — the next start of the same kind does that too.
 */

import { EXERCISE_KINDS } from "@/lib/practice/question";
import type { SourceState } from "@/lib/practice/source";

export const SITTING_KINDS = [
  "practice",
  "brainstorm",
  "study",
  "grammar",
  "reading",
] as const;
export type SittingKind = (typeof SITTING_KINDS)[number];

export const ENDED_REASONS = ["completed", "abandoned"] as const;
export type EndedReason = (typeof ENDED_REASONS)[number];

export const REVIEW_VERDICTS = ["correct", "almost", "wrong"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const LOG_KINDS = [...EXERCISE_KINDS, "study", "graduate"] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const MIN_ELAPSED_MS = 1;
export const MAX_ELAPSED_MS = 120_000;
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

export type SittingDraft = {
  kind: SittingKind;
  label: string;
  sourceState: SourceState;
  setIds: string[];
  dueAtStart: number;
  newAtStart: number;
  startedAt: Date;
  lastAt: Date;
  endedAt: Date | null;
  endedReason: EndedReason | null;
  durationSec: number;
  reviews: number;
  goods: number;
  agains: number;
  introduced: number;
  score: number | null;
  missedRuleIds: string[];
};

export function isSittingKind(value: unknown): value is SittingKind {
  return (
    typeof value === "string" &&
    (SITTING_KINDS as readonly string[]).includes(value)
  );
}

export function isEndedReason(value: unknown): value is EndedReason {
  return (
    typeof value === "string" &&
    (ENDED_REASONS as readonly string[]).includes(value)
  );
}

export function isReviewVerdict(value: unknown): value is ReviewVerdict {
  return (
    typeof value === "string" &&
    (REVIEW_VERDICTS as readonly string[]).includes(value)
  );
}

export function isLogKind(value: unknown): value is LogKind {
  return (
    typeof value === "string" &&
    (LOG_KINDS as readonly string[]).includes(value)
  );
}

/** FSRS still collapses almost into good; the log keeps the three-way verdict. */
export function ratingOfVerdict(verdict: ReviewVerdict): "again" | "good" {
  return verdict === "wrong" ? "again" : "good";
}

/** Show → answer. A blink floors at 1ms; a pause longer than two minutes caps. */
export function clampElapsedMs(ms: number): number {
  if (!Number.isFinite(ms)) return MIN_ELAPSED_MS;
  return Math.min(MAX_ELAPSED_MS, Math.max(MIN_ELAPSED_MS, Math.round(ms)));
}

export function durationSec(startedAt: Date, lastAt: Date): number {
  return Math.max(
    0,
    Math.round((lastAt.getTime() - startedAt.getTime()) / 1000),
  );
}

export function isStale(lastAt: Date, now: Date): boolean {
  return now.getTime() - lastAt.getTime() >= STALE_AFTER_MS;
}

export function startSitting(input: {
  kind: SittingKind;
  label: string;
  sourceState: SourceState;
  setIds?: string[];
  dueAtStart?: number;
  newAtStart?: number;
  now: Date;
}): SittingDraft {
  return {
    kind: input.kind,
    label: input.label,
    sourceState: input.sourceState,
    setIds: input.setIds ?? [],
    dueAtStart: input.dueAtStart ?? 0,
    newAtStart: input.newAtStart ?? 0,
    startedAt: input.now,
    lastAt: input.now,
    endedAt: null,
    endedReason: null,
    durationSec: 0,
    reviews: 0,
    goods: 0,
    agains: 0,
    introduced: 0,
    score: null,
    missedRuleIds: [],
  };
}

export function touchSitting(
  sitting: SittingDraft,
  input: {
    now: Date;
    rating?: "again" | "good";
    introduced?: boolean;
    score?: number;
    missedRuleIds?: string[];
  },
): SittingDraft {
  if (sitting.endedAt) return sitting;

  const next: SittingDraft = { ...sitting, lastAt: input.now };
  if (input.rating === "good") {
    next.reviews += 1;
    next.goods += 1;
  } else if (input.rating === "again") {
    next.reviews += 1;
    next.agains += 1;
  }
  if (input.introduced) next.introduced += 1;
  if (input.score !== undefined) next.score = input.score;
  if (input.missedRuleIds) next.missedRuleIds = input.missedRuleIds;
  next.durationSec = durationSec(next.startedAt, next.lastAt);
  return next;
}

/** Reverse the count deltas from one persisted review without rewinding time. */
export function undoSittingTouch(
  sitting: SittingDraft,
  input: {
    rating: "again" | "good";
    introduced: boolean;
    graduation?: boolean;
  },
): SittingDraft {
  const next = { ...sitting };
  if (!input.graduation) {
    next.reviews = Math.max(0, next.reviews - 1);
    if (input.rating === "good") {
      next.goods = Math.max(0, next.goods - 1);
    } else {
      next.agains = Math.max(0, next.agains - 1);
    }
  }
  if (input.introduced) {
    next.introduced = Math.max(0, next.introduced - 1);
  }
  return next;
}

/**
 * Close a sitting. Duration still comes from lastAt, not `now` — so finishing
 * the summary, closing the tab, or going stale does not add idle time.
 * A sitting with no patch for three hours ends at lastAt, not at the closer.
 */
export function endSitting(
  sitting: SittingDraft,
  reason: EndedReason,
  now: Date,
): SittingDraft {
  if (sitting.endedAt) return sitting;

  const lastAt = sitting.lastAt;
  return {
    ...sitting,
    endedAt: isStale(lastAt, now) ? lastAt : now,
    endedReason: reason,
    durationSec: durationSec(sitting.startedAt, lastAt),
  };
}
