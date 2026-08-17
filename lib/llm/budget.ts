import { getPrisma } from "@/lib/prisma";

/**
 * The ceiling on what one person can spend of our key in a day, and the
 * counters that say whether the shared base is earning its keep.
 *
 * The limit is not a nicety. Sign-in is open (Google or email and password)
 * with no allow-list, so the translate route is reachable by anyone who can
 * complete it; the only thing between that and a bill from Anthropic is this
 * file. A second, app-wide ceiling sits on the same table so extra accounts
 * cannot multiply the personal allowance.
 *
 * Request and token ceilings are reserved atomically before inference. Input
 * tokens come from Anthropic's token-count endpoint; output reserves the
 * request's hard `max_tokens` ceiling. A completed request returns only the
 * unused part of that reservation, so parallel streams cannot overspend.
 */

/** What a day of usage looks like to the limit check. */
export type UsageCounts = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

export type Limits = UsageCounts;

export type TokenReservation = Pick<
  UsageCounts,
  "inputTokens" | "outputTokens"
>;

const INPUT_TOKEN_COUNT_MARGIN = 256;
const INPUT_TOKEN_FRAMING_ALLOWANCE = 1_024;

/**
 * Anthropic documents token counting as an estimate that can differ slightly
 * from billed input. The serialized UTF-8 byte length is a deliberately loose
 * tokenizer-independent ceiling for request content; the fixed allowance
 * covers message framing that is not represented by that JSON.
 */
export function conservativeInputTokenReservation(
  request: unknown,
  countedTokens: number,
): number {
  const bytes = new TextEncoder().encode(JSON.stringify(request)).byteLength;
  return Math.max(
    countedTokens + INPUT_TOKEN_COUNT_MARGIN,
    bytes + INPUT_TOKEN_FRAMING_ALLOWANCE,
  );
}

/**
 * Measured, not guessed: one 40-word list costs ~$0.004 — 612 input and 706
 * output tokens. So 50 requests is about 20 US cents a day per person, and the
 * token caps stop a single enormous paste from spending that in one go.
 * Output is capped tighter than input because output is five times the price
 * and is where the money actually goes (85% of that measured request).
 */
export const DEFAULT_LIMITS: Limits = {
  requests: 50,
  inputTokens: 100_000,
  outputTokens: 60_000,
};

/**
 * One personal allowance for the whole app. Extra accounts cannot spend more
 * than a single person already could: the per-user caps still apply, and they
 * share this pot.
 */
export const DEFAULT_GLOBAL_LIMITS: Limits = {
  requests: 50,
  inputTokens: 100_000,
  outputTokens: 60_000,
};

/** Sentinel `userId` on LlmUsage for the app-wide UTC-day row. */
export const GLOBAL_LLM_USAGE_USER_ID = "__llm_global__";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boundedEnvInt(name: string, hardMaximum: number): number {
  return Math.min(envInt(name, hardMaximum), hardMaximum);
}

export function activeLimits(): Limits {
  return {
    requests: envInt("LLM_DAILY_REQUESTS", DEFAULT_LIMITS.requests),
    inputTokens: envInt("LLM_DAILY_INPUT_TOKENS", DEFAULT_LIMITS.inputTokens),
    outputTokens: envInt("LLM_DAILY_OUTPUT_TOKENS", DEFAULT_LIMITS.outputTokens),
  };
}

export function activeGlobalLimits(): Limits {
  return {
    requests: boundedEnvInt(
      "LLM_GLOBAL_DAILY_REQUESTS",
      DEFAULT_GLOBAL_LIMITS.requests,
    ),
    inputTokens: boundedEnvInt(
      "LLM_GLOBAL_DAILY_INPUT_TOKENS",
      DEFAULT_GLOBAL_LIMITS.inputTokens,
    ),
    outputTokens: boundedEnvInt(
      "LLM_GLOBAL_DAILY_OUTPUT_TOKENS",
      DEFAULT_GLOBAL_LIMITS.outputTokens,
    ),
  };
}

/**
 * The day a moment belongs to, in UTC. Everyone's allowance resets at the same
 * instant rather than at their local midnight: a per-timezone reset would let
 * one account claim two allowances by moving, and nobody watching this number
 * cares which hour it flipped.
 */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds until the allowance resets — what a 429 should put in Retry-After. */
export function secondsUntilReset(now: Date): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.ceil((midnight - now.getTime()) / 1000);
}

export type BudgetVerdict =
  | { withinBudget: true }
  | { withinBudget: false; reason: string; message: string; retryAfter: number };

const RESET_HINT = "Your allowance resets at midnight UTC.";

/**
 * Pure, so the boundaries can be pinned down without a database: spent exactly
 * the limit is spent out, one short of it is not.
 */
export function checkBudget(
  used: UsageCounts,
  limits: Limits,
  now: Date,
): BudgetVerdict {
  const retryAfter = secondsUntilReset(now);

  if (used.requests >= limits.requests) {
    return {
      withinBudget: false,
      reason: "requests",
      message: `You have used today's ${limits.requests} automatic translations. ${RESET_HINT}`,
      retryAfter,
    };
  }
  if (used.outputTokens >= limits.outputTokens) {
    return {
      withinBudget: false,
      reason: "outputTokens",
      message: `Today's translation allowance is used up. ${RESET_HINT}`,
      retryAfter,
    };
  }
  if (used.inputTokens >= limits.inputTokens) {
    return {
      withinBudget: false,
      reason: "inputTokens",
      message: `Today's translation allowance is used up. ${RESET_HINT}`,
      retryAfter,
    };
  }

  return { withinBudget: true };
}

/** Thrown by assertWithinBudget; the route turns it into a 429. */
export class BudgetExceededError extends Error {
  readonly reason: string;
  readonly retryAfter: number;
  readonly usageUserId: string;

  constructor(
    verdict: Extract<BudgetVerdict, { withinBudget: false }>,
    usageUserId: string,
  ) {
    super(verdict.message);
    this.name = "BudgetExceededError";
    this.reason = verdict.reason;
    this.retryAfter = verdict.retryAfter;
    this.usageUserId = usageUserId;
  }
}

const EMPTY: UsageCounts = { requests: 0, inputTokens: 0, outputTokens: 0 };

type UsageCountsRow = UsageCounts | null;

type LlmUsageDelegate = {
  upsert(args: object): Promise<unknown>;
  findUnique(args: object): Promise<UsageCountsRow>;
  updateMany(args: object): Promise<{ count: number }>;
};

export type LlmBudgetDependencies = {
  usage: LlmUsageDelegate;
  transaction?<T>(
    operation: (usage: LlmUsageDelegate) => Promise<T>,
  ): Promise<T>;
};

function defaultDependencies(): LlmBudgetDependencies {
  const prisma = getPrisma();
  return {
    usage: prisma.llmUsage as unknown as LlmUsageDelegate,
    transaction(operation) {
      return prisma.$transaction((transaction) =>
        operation(transaction.llmUsage as unknown as LlmUsageDelegate),
      );
    },
  };
}

/** Today's spend for one user. Absent row means nothing spent yet. */
export async function usageToday(
  userId: string,
  now: Date = new Date(),
): Promise<UsageCounts> {
  const row = await getPrisma().llmUsage.findUnique({
    where: { userId_day: { userId, day: utcDay(now) } },
    select: { requests: true, inputTokens: true, outputTokens: true },
  });
  return row ?? EMPTY;
}

/** Call before going to the model. Throws BudgetExceededError when spent out. */
export async function assertWithinBudget(
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const verdict = checkBudget(await usageToday(userId, now), activeLimits(), now);
  if (!verdict.withinBudget) throw new BudgetExceededError(verdict, userId);
}

function requestsSpentOut(
  limit: number,
  now: Date,
  revealLimit: boolean,
): Extract<BudgetVerdict, { withinBudget: false }> {
  return {
    withinBudget: false,
    reason: "requests",
    message: revealLimit
      ? `You have used today's ${limit} automatic translations. ${RESET_HINT}`
      : `Today's translation allowance is used up. ${RESET_HINT}`,
    retryAfter: secondsUntilReset(now),
  };
}

async function reserveSlot(
  usage: LlmUsageDelegate,
  userId: string,
  day: string,
  limits: Limits,
  reservation: TokenReservation,
  now: Date,
  revealRequestLimit: boolean,
): Promise<void> {
  await usage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day },
    update: {},
  });

  const reserved = await usage.updateMany({
    where: {
      userId,
      day,
      requests: { lt: limits.requests },
      inputTokens: { lte: limits.inputTokens - reservation.inputTokens },
      outputTokens: { lte: limits.outputTokens - reservation.outputTokens },
    },
    data: {
      requests: { increment: 1 },
      inputTokens: { increment: reservation.inputTokens },
      outputTokens: { increment: reservation.outputTokens },
    },
  });
  if (reserved.count === 1) return;

  const used =
    (await usage.findUnique({
      where: { userId_day: { userId, day } },
      select: { requests: true, inputTokens: true, outputTokens: true },
    })) ?? EMPTY;
  const retryAfter = secondsUntilReset(now);
  let verdict: Extract<BudgetVerdict, { withinBudget: false }>;
  if (used.requests + 1 > limits.requests) {
    verdict = requestsSpentOut(limits.requests, now, revealRequestLimit);
  } else if (
    used.outputTokens + reservation.outputTokens >
    limits.outputTokens
  ) {
    verdict = {
      withinBudget: false,
      reason: "outputTokens",
      message: `Today's translation allowance is used up. ${RESET_HINT}`,
      retryAfter,
    };
  } else {
    verdict = {
      withinBudget: false,
      reason: "inputTokens",
      message: `Today's translation allowance is used up. ${RESET_HINT}`,
      retryAfter,
    };
  }
  throw new BudgetExceededError(verdict, userId);
}

/**
 * Atomically reserve one request plus its input/output bounds on both the
 * person and the app-wide ceiling. Parallel calls cannot all slip through a
 * read-then-call gap: the conditional increment itself is the gate. Global is
 * reserved first so extra accounts cannot multiply the bill.
 */
export async function reserveLlmUsage(
  userId: string,
  reservation: TokenReservation,
  now: Date = new Date(),
  {
    limits = activeLimits(),
    globalLimits = activeGlobalLimits(),
    dependencies = defaultDependencies(),
  }: {
    limits?: Limits;
    globalLimits?: Limits;
    dependencies?: LlmBudgetDependencies;
  } = {},
): Promise<void> {
  const day = utcDay(now);
  const reserve = async (usage: LlmUsageDelegate) => {
    await reserveSlot(
      usage,
      GLOBAL_LLM_USAGE_USER_ID,
      day,
      globalLimits,
      reservation,
      now,
      false,
    );
    await reserveSlot(usage, userId, day, limits, reservation, now, true);
  };

  try {
    if (dependencies.transaction) {
      await dependencies.transaction(reserve);
    } else {
      await reserve(dependencies.usage);
    }
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      await dependencies.usage.upsert({
        where: { userId_day: { userId: error.usageUserId, day } },
        create: {
          userId: error.usageUserId,
          day,
          capReachedAt: now,
          capReason: error.reason,
          capAttempts: 1,
        },
        update: {
          capReachedAt: now,
          capReason: error.reason,
          capAttempts: { increment: 1 },
        },
      });
    }
    throw error;
  }
}

/**
 * Replaces a conservative completed reservation with provider-reported usage.
 * If reconciliation fails, the larger reservation remains charged.
 */
export async function reconcileLlmUsage(
  userId: string,
  reservation: TokenReservation,
  actual: TokenReservation,
  now: Date = new Date(),
  dependencies: LlmBudgetDependencies = defaultDependencies(),
): Promise<void> {
  if (
    actual.inputTokens > reservation.inputTokens ||
    actual.outputTokens > reservation.outputTokens
  ) {
    throw new Error("Provider usage exceeded its reserved token ceiling.");
  }

  const day = utcDay(now);
  const inputTokens = reservation.inputTokens - actual.inputTokens;
  const outputTokens = reservation.outputTokens - actual.outputTokens;
  if (inputTokens === 0 && outputTokens === 0) return;

  const reconcile = async (usage: LlmUsageDelegate) => {
    for (const usageUserId of [GLOBAL_LLM_USAGE_USER_ID, userId]) {
      const updated = await usage.updateMany({
        where: {
          userId: usageUserId,
          day,
          inputTokens: { gte: inputTokens },
          outputTokens: { gte: outputTokens },
        },
        data: {
          inputTokens: { decrement: inputTokens },
          outputTokens: { decrement: outputTokens },
        },
      });
      if (updated.count !== 1) {
        throw new Error("LLM token reservation could not be reconciled.");
      }
    }
  };

  if (dependencies.transaction) {
    await dependencies.transaction(reconcile);
  } else {
    await reconcile(dependencies.usage);
  }
}

export type UsageDelta = Partial<{ lexiconHits: number; llmMisses: number }>;

/**
 * Add to today's row, creating it if this is the day's first call. Hits are
 * recorded even when nothing went to the model — a day of pure cache hits is
 * the result we are hoping for, and it has to be visible in the ratio.
 */
export async function recordUsage(
  userId: string,
  delta: UsageDelta,
  now: Date = new Date(),
): Promise<void> {
  const day = utcDay(now);
  const amounts = {
    lexiconHits: delta.lexiconHits ?? 0,
    llmMisses: delta.llmMisses ?? 0,
  };

  const prisma = getPrisma();
  await prisma.llmUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, ...amounts },
    update: {
      lexiconHits: { increment: amounts.lexiconHits },
      llmMisses: { increment: amounts.llmMisses },
    },
  });
}
