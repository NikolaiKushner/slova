/**
 * What a session draws on: a state of the word, and optionally which sets.
 *
 * One module because three places need the same answer and must not disagree
 * about it — the counts shown in the source panel, the words a training
 * actually receives, and the estimate on the mode cards. When those drift, the
 * bar promises twelve words and the session asks eight.
 *
 * Kept free of Prisma imports so it can be reasoned about, and tested, without
 * a database: the filters are plain objects the query layer spreads.
 */

export const SOURCE_STATES = ["due", "new", "hard", "all"] as const;

export type SourceState = (typeof SOURCE_STATES)[number];

export const DEFAULT_SOURCE_STATE: SourceState = "due";

/** What a session draws on, as chosen once on the trainings page. */
export type Source = { state: SourceState; setIds: string[] };

/**
 * The source as a query string. It travels in the address rather than in
 * component state so a training is reloadable and sharable, and so the second
 * screen that used to ask this question could go.
 */
export function sourceQuery(source: Source, extra?: Record<string, string>) {
  const params = new URLSearchParams({ state: source.state, ...extra });
  for (const id of source.setIds) params.append("set", id);
  return params.toString();
}

export function isSourceState(value: unknown): value is SourceState {
  return (
    typeof value === "string" &&
    (SOURCE_STATES as readonly string[]).includes(value)
  );
}

export function toSourceState(value: unknown): SourceState {
  return isSourceState(value) ? value : DEFAULT_SOURCE_STATE;
}

/**
 * Two or more lapses. A word that has been forgotten once is ordinary — that
 * is what the schedule is for — and calling it hard would put most of the
 * dictionary in the list. Twice is a pattern.
 */
export const HARD_LAPSES = 2;

/**
 * The `where` fragment for one state, to be spread beside the user and set
 * scope. `now` is passed in rather than read, so a count and the query that
 * follows it cannot land on different sides of a due date.
 */
export function stateFilter(state: SourceState, now: Date) {
  switch (state) {
    case "new":
      return { introducedAt: null };
    case "due":
      return { introducedAt: { not: null }, dueAt: { lte: now } };
    case "hard":
      return { lapses: { gte: HARD_LAPSES } };
    case "all":
      return {};
  }
}

/** Sets are a filter, not a folder: none chosen means the whole dictionary. */
export function setFilter(setIds: readonly string[]) {
  const ids = setIds.filter(Boolean);
  return ids.length > 0 ? { sets: { some: { setId: { in: ids } } } } : {};
}

/**
 * Below this a sitting is thin enough to be worth mentioning — but never
 * worth blocking (§16). Somebody with four due words is allowed to drill them.
 */
export const THIN_SESSION = 5;
