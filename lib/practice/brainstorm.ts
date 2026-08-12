import type { ExerciseKind, PracticeWord } from "@/lib/practice/question";

/**
 * Brainstorm: one sitting, and the words do not leave it until they are known.
 *
 * This is not spaced repetition and must not be confused with it. Spacing
 * decides *when to come back tomorrow*; this decides *whether the word was
 * learned today*. A word climbs a ladder of formats — recognise it, recognise
 * it backwards, assemble it, type it — and each rung is harder than the last.
 * Get one wrong and you drop a rung. Nothing leaves the queue until it has
 * been through the whole ladder cleanly.
 *
 * The gaps between a word's turns widen as it goes: right after an error it
 * comes back almost immediately, and once it is going well it waits longer.
 * That is expanding rehearsal, and it is the part that makes a single session
 * stick rather than just feel busy.
 *
 * The whole thing is a pure function of `(state, correct) => state`, which is
 * the only reason it can be trusted: an algorithm that decides when a person
 * is finished should be testable without a browser.
 */

/** A rung of the ladder. The first look at the words happens before any of
 * these: the whole set is shown in one table, with translations, and the
 * drilling starts when the person says they are ready. Meeting words one card
 * at a time buried that introduction inside the drill, where it read as a
 * question with no answer. */
export type BrainstormStep = ExerciseKind;

export type SessionWord = {
  wordId: string;
  ladder: BrainstormStep[];
  /** How far up the ladder, 0-based. */
  pos: number;
  /** Wrong answers so far, over the whole session. Drives the SRS handover. */
  errors: number;
};

type QueueEntry = { wordId: string; dueAt: number };

export type BrainstormState = {
  /** Logical clock: one tick per answer, not a wall time. */
  tick: number;
  words: SessionWord[];
  queue: QueueEntry[];
  /** Finished cleanly, ready to be handed to the scheduler. */
  mastered: string[];
  /** Given up on for today — see STRUGGLE_LIMIT. */
  struggling: string[];
};

export type BrainstormTask = {
  wordId: string;
  step: BrainstormStep;
  /** For a progress readout: words still in the session, not a percentage. */
  remaining: number;
};

/**
 * The default climb: see it, recognise it, recognise it in reverse, build it,
 * write it. Audio rungs are added only when a voice is actually available, so
 * a silent device gets a shorter ladder rather than an impossible one.
 */
export const DEFAULT_LADDER: BrainstormStep[] = [
  "word-to-translation",
  "translation-to-word",
  "builder",
  "typing",
];

export const AUDIO_LADDER: BrainstormStep[] = [
  "word-to-translation",
  "audio-choice",
  "translation-to-word",
  "builder",
  "listening",
  "typing",
];

/**
 * Widening gaps, in turns. The first repeat comes soon; by the top of the
 * ladder the word has to survive a longer wait to count.
 */
const GAPS = [2, 3, 5, 8];

/** How soon a word comes back after a mistake — soon, but not immediately. */
const GAP_AFTER_ERROR = 2;

/**
 * Six mistakes on one word and the session stops fighting it. Without this a
 * single hard word can hold someone in a loop they cannot leave, which is the
 * failure mode of every drill-to-mastery design.
 */
export const STRUGGLE_LIMIT = 6;

/**
 * Six words a sitting. Few enough that the opening table can be taken in at a
 * glance and held in mind through the drilling that follows — which is the
 * point of showing it, and stops being true somewhere around eight.
 */
export const SESSION_SIZE = 6;

export function startBrainstorm(
  words: readonly PracticeWord[],
  ladder: BrainstormStep[] = DEFAULT_LADDER,
): BrainstormState {
  const chosen = words.slice(0, SESSION_SIZE);
  return {
    tick: 0,
    words: chosen.map((word) => ({
      wordId: word.id,
      ladder,
      pos: 0,
      errors: 0,
    })),
    // Spread across the opening ticks, so the first pass asks every word once
    // before any of them comes round again.
    queue: chosen.map((word, index) => ({ wordId: word.id, dueAt: index })),
    mastered: [],
    struggling: [],
  };
}

/** What to ask next, or null when the session is over. */
export function currentTask(state: BrainstormState): BrainstormTask | null {
  const next = nextEntry(state);
  if (!next) return null;

  const word = state.words.find((w) => w.wordId === next.wordId);
  if (!word) return null;

  return {
    wordId: word.wordId,
    step: word.ladder[word.pos],
    remaining: state.queue.length,
  };
}

function nextEntry(state: BrainstormState): QueueEntry | null {
  if (state.queue.length === 0) return null;
  // Earliest due wins; ties keep the order they were added, which is what
  // makes the opening pass run through the words in their listed order.
  return state.queue.reduce((best, entry) =>
    entry.dueAt < best.dueAt ? entry : best,
  );
}

/**
 * Answer the current task. `correct` is the caller's verdict — for typed
 * answers an "almost" counts as correct, and showing the right spelling is the
 * caller's job.
 */
export function answerBrainstorm(
  state: BrainstormState,
  correct: boolean,
): BrainstormState {
  const entry = nextEntry(state);
  if (!entry) return state;

  const word = state.words.find((w) => w.wordId === entry.wordId);
  if (!word) return state;

  const tick = state.tick + 1;
  const queue = state.queue.filter((q) => q !== entry);

  if (correct) {
    const pos = word.pos + 1;
    const updated = { ...word, pos };

    // Off the top of the ladder: learned, for today at least.
    if (pos >= word.ladder.length) {
      return {
        ...state,
        tick,
        queue,
        words: replace(state.words, updated),
        mastered: [...state.mastered, word.wordId],
      };
    }

    return {
      ...state,
      tick,
      queue: [...queue, { wordId: word.wordId, dueAt: tick + gapFor(pos) }],
      words: replace(state.words, updated),
    };
  }

  const errors = word.errors + 1;
  // Down a rung, never off the bottom.
  const pos = Math.max(0, word.pos - 1);
  const updated = { ...word, pos, errors };

  if (errors >= STRUGGLE_LIMIT) {
    return {
      ...state,
      tick,
      queue,
      words: replace(state.words, updated),
      struggling: [...state.struggling, word.wordId],
    };
  }

  return {
    ...state,
    tick,
    queue: [...queue, { wordId: word.wordId, dueAt: tick + GAP_AFTER_ERROR }],
    words: replace(state.words, updated),
  };
}

function gapFor(pos: number): number {
  return GAPS[Math.min(pos, GAPS.length - 1)] ?? GAPS[GAPS.length - 1];
}

function replace(words: SessionWord[], updated: SessionWord): SessionWord[] {
  return words.map((word) => (word.wordId === updated.wordId ? updated : word));
}

export function isFinished(state: BrainstormState): boolean {
  return state.queue.length === 0;
}

/**
 * What the scheduler should start this word on.
 *
 * The point of the handover: a word that went through the whole ladder without
 * a stumble is genuinely better known than one that took six goes, and giving
 * both the same starting interval and the same ease throws that away. This is
 * the one honest signal about a new word we will ever get, and it costs
 * nothing to pass along.
 *
 * Deliberately expressed in this app's scheduler, not SM-2's: ease lives
 * between 1.3 and 3.0 here, and there are two ratings rather than six.
 */
export function graduate(word: Pick<SessionWord, "errors">): {
  intervalDays: number;
  ease: number;
} {
  if (word.errors === 0) return { intervalDays: 1, ease: 2.7 };
  if (word.errors === 1) return { intervalDays: 1, ease: 2.5 };
  if (word.errors <= 3) return { intervalDays: 1, ease: 2.3 };
  // Shaky: due again the same day rather than tomorrow.
  return { intervalDays: 0, ease: 2.1 };
}
