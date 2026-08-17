import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { SOURCE_STATES } from "@/lib/practice/source";
import {
  ENDED_REASONS,
  SITTING_KINDS,
  isEndedReason,
  isSittingKind,
} from "@/lib/sitting";
import { persistEnd, persistStart, persistTouch } from "@/lib/sitting-store";

const startSchema = z.object({
  kind: z.enum(SITTING_KINDS),
  label: z.string().trim().min(1).max(120),
  sourceState: z.enum(SOURCE_STATES),
  setIds: z.array(z.string().min(1).max(80)).max(50).default([]),
});

const patchSchema = z.object({
  id: z.string().min(1),
  rating: z.enum(["again", "good"]).optional(),
  introduced: z.boolean().optional(),
  endedReason: z.enum(ENDED_REASONS).optional(),
  score: z.number().int().min(0).max(100).optional(),
  missedRuleIds: z.array(z.string().min(1).max(80)).max(50).optional(),
});

const beaconSchema = z.object({
  id: z.string().min(1),
  endedReason: z.enum(ENDED_REASONS),
});

/**
 * POST starts a sitting, or closes one from pagehide (sendBeacon is POST).
 * PATCH records an answer or ends the sitting from the summary screen.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const closing = beaconSchema.safeParse(body);
  if (closing.success) {
    await persistEnd(
      session.user.id,
      closing.data.id,
      closing.data.endedReason,
    );
    return NextResponse.json({ ok: true });
  }

  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalidSitting", 400);
  if (!isSittingKind(parsed.data.kind)) return jsonError("invalidSitting", 400);

  const id = await persistStart(session.user.id, parsed.data);
  return NextResponse.json({ id });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalidSitting", 400);

  if (parsed.data.endedReason && isEndedReason(parsed.data.endedReason)) {
    await persistEnd(session.user.id, parsed.data.id, parsed.data.endedReason, {
      score: parsed.data.score,
      missedRuleIds: parsed.data.missedRuleIds,
    });
    return NextResponse.json({ ok: true });
  }

  await persistTouch(session.user.id, parsed.data.id, {
    rating: parsed.data.rating,
    introduced: parsed.data.introduced,
    score: parsed.data.score,
    missedRuleIds: parsed.data.missedRuleIds,
  });
  return NextResponse.json({ ok: true });
}
