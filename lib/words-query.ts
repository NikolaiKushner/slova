import { LEARNED_INTERVAL_DAYS } from "@/lib/word-rating";

/**
 * Turning the query string of the word list into a database query.
 *
 * Pure and separate from the route because this is where a paginated list goes
 * wrong: a page number arriving as `-1`, a page size arriving as `100000`, a
 * sort column arriving as something that is not a column at all. Each of those
 * is a URL anyone can type, and the answer to all three is the same — clamp it
 * here, once, where it can be tested without a database.
 */

/** Rows per page. The list is meant to be read, not scrolled forever. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const SORT_FIELDS = ["word", "translation", "rating", "added"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export type WordsQuery = {
  page: number;
  pageSize: number;
  /** Free text, matched against both sides of the card. Empty means no filter. */
  q: string;
  /** A set id, or "" for every word, or "none" for words in no set at all. */
  set: string;
  sort: SortField;
  dir: "asc" | "desc";
};

function intParam(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseWordsQuery(params: URLSearchParams): WordsQuery {
  const sortRaw = params.get("sort");
  const sort = (SORT_FIELDS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as SortField)
    : "added";

  // Newest first by default: the words just added are the ones being looked
  // for. Every other column reads better ascending.
  const dirRaw = params.get("dir");
  const dir =
    dirRaw === "asc" || dirRaw === "desc"
      ? dirRaw
      : sort === "added"
        ? "desc"
        : "asc";

  return {
    page: Math.max(intParam(params.get("page"), 1), 1),
    pageSize: clamp(
      intParam(params.get("pageSize"), DEFAULT_PAGE_SIZE),
      1,
      MAX_PAGE_SIZE,
    ),
    q: (params.get("q") ?? "").trim(),
    set: (params.get("set") ?? "").trim(),
    sort,
    dir,
  };
}

/** Prisma `where` for one user's words under this query. */
export function wordsWhere(userId: string, query: WordsQuery) {
  const where: Record<string, unknown> = { userId };

  if (query.q) {
    where.OR = [
      { front: { contains: query.q, mode: "insensitive" } },
      { back: { contains: query.q, mode: "insensitive" } },
    ];
  }

  if (query.set === "none") {
    where.sets = { none: {} };
  } else if (query.set) {
    where.sets = { some: { setId: query.set } };
  }

  return where;
}

/**
 * Prisma `orderBy`. Rating is not a column — it is a function of
 * `intervalDays`, and a monotone one, so ordering by that column orders by
 * rating exactly. `introducedAt` breaks the tie between never-studied words
 * and words whose interval has been reset, which share an interval of zero.
 */
export function wordsOrderBy(query: WordsQuery) {
  switch (query.sort) {
    case "word":
      return [{ front: query.dir }, { id: "asc" as const }];
    case "translation":
      return [{ back: query.dir }, { id: "asc" as const }];
    case "rating":
      return [
        { intervalDays: query.dir },
        { introducedAt: query.dir },
        { id: "asc" as const },
      ];
    case "added":
      return [{ createdAt: query.dir }, { id: "asc" as const }];
  }
}

export function wordsSkip(query: WordsQuery): number {
  return (query.page - 1) * query.pageSize;
}

/** How many pages the whole result set makes; always at least one. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Re-exported so the table and the query agree on where "learned" begins. */
export { LEARNED_INTERVAL_DAYS };
