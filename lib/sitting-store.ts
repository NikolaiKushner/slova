/**
 * Persist sittings. The draft math lives in `lib/sitting.ts` so tests can
 * run it without Postgres; this file is the write path the routes share.
 */

import { getPrisma } from "@/lib/prisma";
import { setFilter, stateFilter } from "@/lib/practice/source";
import {
  isStale,
  startSitting,
  type EndedReason,
  type SittingDraft,
  type SittingKind,
} from "@/lib/sitting";
import { getStudySummary } from "@/lib/study-queue";
import type {
  Prisma,
  PrismaClient,
} from "@/app/generated/prisma/client";

async function queueSnapshot(
  userId: string,
  kind: SittingKind,
  sourceState: SittingDraft["sourceState"],
  setIds: string[],
  now: Date,
  timeZone?: string,
) {
  if (kind === "grammar") return { dueAtStart: 0, newAtStart: 0 };
  if (kind === "study") {
    const summary = await getStudySummary(userId, now, timeZone);
    return { dueAtStart: summary.dueReviews, newAtStart: summary.unseen };
  }

  const prisma = getPrisma();
  const scope = { userId, ...setFilter(setIds) };
  const [dueAtStart, newAtStart] = await Promise.all([
    prisma.userWord.count({
      where: { ...scope, ...stateFilter("due", now) },
    }),
    prisma.userWord.count({
      where: { ...scope, ...stateFilter("new", now) },
    }),
  ]);
  return { dueAtStart, newAtStart };
}

async function closeOpenOfKind(
  userId: string,
  kind: SittingKind,
  now: Date,
) {
  const prisma = getPrisma();
  const open = await prisma.studySitting.findMany({
    where: { userId, kind, endedAt: null },
    select: { id: true },
  });
  for (const row of open) {
    await persistEnd(userId, row.id, "abandoned", { now });
  }
}

export async function persistStart(
  userId: string,
  input: {
    kind: SittingKind;
    label: string;
    sourceState: SittingDraft["sourceState"];
    setIds: string[];
    now?: Date;
    timeZone?: string;
  },
): Promise<string> {
  const now = input.now ?? new Date();
  await closeOpenOfKind(userId, input.kind, now);
  const snapshot = await queueSnapshot(
    userId,
    input.kind,
    input.sourceState,
    input.setIds,
    now,
    input.timeZone,
  );
  const draft = startSitting({ ...input, ...snapshot, now });
  const created = await getPrisma().studySitting.create({
    data: {
      userId,
      kind: draft.kind,
      label: draft.label,
      sourceState: draft.sourceState,
      setIds: draft.setIds,
      dueAtStart: draft.dueAtStart,
      newAtStart: draft.newAtStart,
      startedAt: draft.startedAt,
      lastAt: draft.lastAt,
      durationSec: draft.durationSec,
    },
    select: { id: true },
  });
  return created.id;
}

export async function persistTouch(
  userId: string,
  id: string,
  input: {
    now?: Date;
    rating?: "again" | "good";
    introduced?: boolean;
    score?: number;
    missedRuleIds?: string[];
    /** ReviewLog writes may arrive just after pagehide closed the sitting. */
    allowEnded?: boolean;
  },
  db: PrismaClient | Prisma.TransactionClient = getPrisma(),
): Promise<void> {
  const now = input.now ?? new Date();
  const reviews = input.rating ? 1 : 0;
  const goods = input.rating === "good" ? 1 : 0;
  const agains = input.rating === "again" ? 1 : 0;
  const introduced = input.introduced ? 1 : 0;
  const allowEnded = input.allowEnded === true;

  // One SQL update keeps overlapping review requests from reading the same
  // counters and writing one another away. A late review may still attach to
  // a just-closed sitting; its timestamp is capped at endedAt.
  await db.$executeRaw`
    UPDATE "StudySitting"
    SET
      "lastAt" = GREATEST(
        "lastAt",
        LEAST(${now}, COALESCE("endedAt", ${now}))
      ),
      "durationSec" = GREATEST(
        "durationSec",
        GREATEST(
          0,
          ROUND(EXTRACT(EPOCH FROM (
            GREATEST(
              "lastAt",
              LEAST(${now}, COALESCE("endedAt", ${now}))
            ) - "startedAt"
          )))::INTEGER
        )
      ),
      "reviews" = "reviews" + ${reviews},
      "goods" = "goods" + ${goods},
      "agains" = "agains" + ${agains},
      "introduced" = "introduced" + ${introduced}
    WHERE
      "id" = ${id}
      AND "userId" = ${userId}
      AND (${allowEnded} OR "endedAt" IS NULL)
  `;

  if (input.score !== undefined || input.missedRuleIds !== undefined) {
    await db.studySitting.updateMany({
      where: {
        id,
        userId,
        ...(allowEnded ? {} : { endedAt: null }),
      },
      data: {
        ...(input.score !== undefined ? { score: input.score } : {}),
        ...(input.missedRuleIds !== undefined
          ? { missedRuleIds: input.missedRuleIds }
          : {}),
      },
    });
  }
}

/** Reverse the count deltas contributed by one exact review operation. */
export async function persistReviewUndo(
  userId: string,
  id: string,
  input: {
    rating: "again" | "good";
    introduced: boolean;
    graduation: boolean;
  },
  db: PrismaClient | Prisma.TransactionClient = getPrisma(),
): Promise<void> {
  const reviews = input.graduation ? 0 : 1;
  const goods = !input.graduation && input.rating === "good" ? 1 : 0;
  const agains = !input.graduation && input.rating === "again" ? 1 : 0;
  const introduced = input.introduced ? 1 : 0;

  // GREATEST protects legacy or manually repaired sittings whose counters may
  // already be below the log-derived value. The log tombstone and these
  // deltas run in the same transaction, so neither half can survive alone.
  await db.$executeRaw`
    UPDATE "StudySitting"
    SET
      "reviews" = GREATEST(0, "reviews" - ${reviews}),
      "goods" = GREATEST(0, "goods" - ${goods}),
      "agains" = GREATEST(0, "agains" - ${agains}),
      "introduced" = GREATEST(0, "introduced" - ${introduced})
    WHERE "id" = ${id} AND "userId" = ${userId}
  `;
}

export async function persistEnd(
  userId: string,
  id: string,
  reason: EndedReason,
  extra?: {
    now?: Date;
    score?: number;
    missedRuleIds?: string[];
  },
  db: PrismaClient | Prisma.TransactionClient = getPrisma(),
): Promise<void> {
  const row = await db.studySitting.findFirst({
    where: { id, userId },
    select: { endedAt: true, lastAt: true },
  });
  if (!row) return;
  const now = extra?.now ?? new Date();
  if (extra?.score !== undefined || extra?.missedRuleIds !== undefined) {
    await db.studySitting.updateMany({
      where: { id, userId },
      data: {
        ...(extra.score !== undefined ? { score: extra.score } : {}),
        ...(extra.missedRuleIds !== undefined
          ? { missedRuleIds: extra.missedRuleIds }
          : {}),
      },
    });
  }
  if (row.endedAt) return;
  await db.studySitting.updateMany({
    where: { id, userId, endedAt: null },
    data: {
      endedAt: isStale(row.lastAt, now) ? row.lastAt : now,
      endedReason: reason,
    },
  });
}
