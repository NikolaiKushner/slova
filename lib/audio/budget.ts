import { getPrisma } from "@/lib/prisma";

export type TtsUsageCounts = {
  requests: number;
  characters: number;
};

export type TtsLimits = TtsUsageCounts;

export const DEFAULT_TTS_LIMITS: TtsLimits = {
  requests: 20,
  characters: 2_000,
};

export const DEFAULT_GLOBAL_TTS_LIMITS: TtsLimits = {
  requests: 100,
  characters: 10_000,
};

export const GLOBAL_TTS_USAGE_USER_ID = "__tts_global__";

type Environment = Record<string, string | undefined>;

function envInt(
  environment: Environment,
  name: string,
  fallback: number,
): number {
  const parsed = Number.parseInt(environment[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boundedEnvInt(
  environment: Environment,
  name: string,
  hardMaximum: number,
): number {
  return Math.min(envInt(environment, name, hardMaximum), hardMaximum);
}

export function activeTtsLimits(
  environment: Environment = process.env,
): TtsLimits {
  return {
    requests: envInt(
      environment,
      "TTS_DAILY_REQUESTS",
      DEFAULT_TTS_LIMITS.requests,
    ),
    characters: envInt(
      environment,
      "TTS_DAILY_CHARACTERS",
      DEFAULT_TTS_LIMITS.characters,
    ),
  };
}

export function activeGlobalTtsLimits(
  environment: Environment = process.env,
): TtsLimits {
  return {
    requests: boundedEnvInt(
      environment,
      "TTS_GLOBAL_DAILY_REQUESTS",
      DEFAULT_GLOBAL_TTS_LIMITS.requests,
    ),
    characters: boundedEnvInt(
      environment,
      "TTS_GLOBAL_DAILY_CHARACTERS",
      DEFAULT_GLOBAL_TTS_LIMITS.characters,
    ),
  };
}

export function ttsUtcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function ttsSecondsUntilReset(now: Date): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.ceil((midnight - now.getTime()) / 1_000);
}

export type TtsBudgetVerdict =
  | { withinBudget: true }
  | {
      withinBudget: false;
      reason: keyof TtsUsageCounts;
      retryAfter: number;
    };

export function checkTtsLimits(
  used: TtsUsageCounts,
  requestedCharacters: number,
  limits: TtsLimits,
  now: Date,
): TtsBudgetVerdict {
  const retryAfter = ttsSecondsUntilReset(now);
  if (used.requests + 1 > limits.requests) {
    return { withinBudget: false, reason: "requests", retryAfter };
  }
  if (used.characters + requestedCharacters > limits.characters) {
    return { withinBudget: false, reason: "characters", retryAfter };
  }
  return { withinBudget: true };
}

export class TtsBudgetExceededError extends Error {
  readonly reason: keyof TtsUsageCounts;
  readonly retryAfter: number;
  readonly usageUserId: string;

  constructor(
    reason: keyof TtsUsageCounts,
    retryAfter: number,
    usageUserId: string,
  ) {
    super("The daily speech allowance is used up.");
    this.name = "TtsBudgetExceededError";
    this.reason = reason;
    this.retryAfter = retryAfter;
    this.usageUserId = usageUserId;
  }
}

type TtsUsageDelegate = {
  upsert(args: object): Promise<unknown>;
  findUnique(args: object): Promise<TtsUsageCounts | null>;
  updateMany(args: object): Promise<{ count: number }>;
};

export type TtsBudgetDependencies = {
  usage: TtsUsageDelegate;
  transaction?<T>(
    operation: (usage: TtsUsageDelegate) => Promise<T>,
  ): Promise<T>;
};

function defaultDependencies(): TtsBudgetDependencies {
  const prisma = getPrisma();
  return {
    usage: prisma.ttsUsage as unknown as TtsUsageDelegate,
    transaction(operation) {
      return prisma.$transaction((transaction) =>
        operation(transaction.ttsUsage as unknown as TtsUsageDelegate),
      );
    },
  };
}

async function reserveUsageRow(
  usage: TtsUsageDelegate,
  userId: string,
  day: string,
  characters: number,
  limits: TtsLimits,
  now: Date,
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
      characters: { lte: limits.characters - characters },
    },
    data: {
      requests: { increment: 1 },
      characters: { increment: characters },
    },
  });
  if (reserved.count === 1) return;

  const used =
    (await usage.findUnique({
      where: { userId_day: { userId, day } },
      select: { requests: true, characters: true },
    })) ?? { requests: 0, characters: 0 };
  const verdict = checkTtsLimits(used, characters, limits, now);
  const reason = verdict.withinBudget ? "characters" : verdict.reason;
  throw new TtsBudgetExceededError(
    reason,
    ttsSecondsUntilReset(now),
    userId,
  );
}

/**
 * Atomically reserves both dimensions before any provider call. Reservations
 * are intentionally not refunded when synthesis or upload fails.
 */
export async function reserveTtsUsage(
  userId: string,
  characters: number,
  {
    now = new Date(),
    limits = activeTtsLimits(),
    globalLimits = activeGlobalTtsLimits(),
    dependencies = defaultDependencies(),
  }: {
    now?: Date;
    limits?: TtsLimits;
    globalLimits?: TtsLimits;
    dependencies?: TtsBudgetDependencies;
  } = {},
): Promise<void> {
  const day = ttsUtcDay(now);
  const reserve = async (usage: TtsUsageDelegate) => {
    await reserveUsageRow(
      usage,
      GLOBAL_TTS_USAGE_USER_ID,
      day,
      characters,
      globalLimits,
      now,
    );
    await reserveUsageRow(
      usage,
      userId,
      day,
      characters,
      limits,
      now,
    );
  };

  try {
    if (dependencies.transaction) {
      await dependencies.transaction(reserve);
    } else {
      await reserve(dependencies.usage);
    }
  } catch (error) {
    if (error instanceof TtsBudgetExceededError) {
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

export type TtsMetricDelta = {
  cacheHits?: number;
  syntheses?: number;
};

export async function recordTtsMetrics(
  userId: string,
  delta: TtsMetricDelta,
  {
    now = new Date(),
    dependencies = defaultDependencies(),
  }: {
    now?: Date;
    dependencies?: TtsBudgetDependencies;
  } = {},
): Promise<void> {
  const day = ttsUtcDay(now);
  const cacheHits = delta.cacheHits ?? 0;
  const syntheses = delta.syntheses ?? 0;
  await dependencies.usage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, cacheHits, syntheses },
    update: {
      cacheHits: { increment: cacheHits },
      syntheses: { increment: syntheses },
    },
  });
}
