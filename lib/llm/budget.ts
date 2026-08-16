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
 * The request slot is reserved atomically (`tryReserveRequest`) so parallel
 * calls cannot all slip through a read-then-call gap. Token cost is still
 * added after the model answers, because it is unknown until then.
 */

/** What a day of usage looks like to the limit check. */
export type UsageCounts = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
};

export type Limits = UsageCounts;

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

export function activeLimits(): Limits {
  return {
    requests: envInt("LLM_DAILY_REQUESTS", DEFAULT_LIMITS.requests),
    inputTokens: envInt("LLM_DAILY_INPUT_TOKENS", DEFAULT_LIMITS.inputTokens),
    outputTokens: envInt("LLM_DAILY_OUTPUT_TOKENS", DEFAULT_LIMITS.outputTokens),
  };
}

export function activeGlobalLimits(): Limits {
  return {
    requests: envInt(
      "LLM_GLOBAL_DAILY_REQUESTS",
      DEFAULT_GLOBAL_LIMITS.requests,
    ),
    inputTokens: envInt(
      "LLM_GLOBAL_DAILY_INPUT_TOKENS",
      DEFAULT_GLOBAL_LIMITS.inputTokens,
    ),
    outputTokens: envInt(
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

  constructor(verdict: Extract<BudgetVerdict, { withinBudget: false }>) {
    super(verdict.message);
    this.name = "BudgetExceededError";
    this.reason = verdict.reason;
    this.retryAfter = verdict.retryAfter;
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
  if (!verdict.withinBudget) throw new BudgetExceededError(verdict);
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
  now: Date,
  revealRequestLimit: boolean,
): Promise<void> {
  await usage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day },
    update: {},
  });

  const used = await usage.findUnique({
    where: { userId_day: { userId, day } },
    select: { requests: true, inputTokens: true, outputTokens: true },
  });
  const tokenVerdict = checkBudget(
    {
      requests: 0,
      inputTokens: used?.inputTokens ?? 0,
      outputTokens: used?.outputTokens ?? 0,
    },
    { ...limits, requests: Number.MAX_SAFE_INTEGER },
    now,
  );
  if (!tokenVerdict.withinBudget) throw new BudgetExceededError(tokenVerdict);

  const reserved = await usage.updateMany({
    where: { userId, day, requests: { lt: limits.requests } },
    data: { requests: { increment: 1 } },
  });
  if (reserved.count === 0) {
    throw new BudgetExceededError(
      requestsSpentOut(limits.requests, now, revealRequestLimit),
    );
  }
}

/**
 * Atomically spend one request slot on both the person and the app-wide
 * ceiling. Parallel calls cannot all slip through a read-then-call gap: the
 * increment itself is the gate. Global is reserved first so extra accounts
 * cannot multiply the bill.
 */
export async function tryReserveRequest(
  userId: string,
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
      now,
      false,
    );
    await reserveSlot(usage, userId, day, limits, now, true);
  };

  if (dependencies.transaction) {
    await dependencies.transaction(reserve);
  } else {
    await reserve(dependencies.usage);
  }
}

export type UsageDelta = Partial<
  UsageCounts & { lexiconHits: number; llmMisses: number }
>;

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
    requests: delta.requests ?? 0,
    inputTokens: delta.inputTokens ?? 0,
    outputTokens: delta.outputTokens ?? 0,
    lexiconHits: delta.lexiconHits ?? 0,
    llmMisses: delta.llmMisses ?? 0,
  };

  const prisma = getPrisma();
  await prisma.llmUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, ...amounts },
    update: {
      requests: { increment: amounts.requests },
      inputTokens: { increment: amounts.inputTokens },
      outputTokens: { increment: amounts.outputTokens },
      lexiconHits: { increment: amounts.lexiconHits },
      llmMisses: { increment: amounts.llmMisses },
    },
  });

  // Requests were reserved atomically before the call. Tokens are only known
  // afterwards, and the global ceiling has to see them or it is requests-only.
  if (amounts.inputTokens > 0 || amounts.outputTokens > 0) {
    await prisma.llmUsage.upsert({
      where: {
        userId_day: { userId: GLOBAL_LLM_USAGE_USER_ID, day },
      },
      create: {
        userId: GLOBAL_LLM_USAGE_USER_ID,
        day,
        inputTokens: amounts.inputTokens,
        outputTokens: amounts.outputTokens,
      },
      update: {
        inputTokens: { increment: amounts.inputTokens },
        outputTokens: { increment: amounts.outputTokens },
      },
    });
  }
}
