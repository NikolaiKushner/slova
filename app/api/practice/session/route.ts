import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { buildPracticeSession } from "@/lib/practice/session";
import { toSourceState } from "@/lib/practice/source";

/**
 * The words for one run of a training, plus the pool its wrong answers come
 * from.
 *
 * One request, and everything after it happens in the browser: questions are
 * built by pure functions the client also has, and answers are judged there
 * too. That is not a shortcut — it is what lets a training answer instantly
 * instead of waiting on a round trip per question, and the only thing that
 * has to reach the server is the outcome, which goes to the existing review
 * endpoint.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const params = new URL(request.url).searchParams;
  // Repeated rather than comma-joined: a set id is opaque and a separator
  // inside one would be silently wrong rather than loudly.
  const setIds = params.getAll("set").map((id) => id.trim()).filter(Boolean);
  const brainstorm = params.get("mode") === "brainstorm";
  // Anything unrecognised falls back to "due" rather than erroring: a bad
  // query string should not be able to break a training.
  const state = toSourceState(params.get("state"));
  // Clamped rather than trusted: the value reaches a `take`, and a query
  // string is not a place to accept an arbitrary row count from.
  const size = Number.parseInt(params.get("size") ?? "", 10);
  const kind = params.get("kind") ?? undefined;

  const { words, pool, sitting, nextDueAt } = await buildPracticeSession(session.user.id, {
    setIds,
    brainstorm,
    state,
    size: Number.isInteger(size) ? size : undefined,
    kind,
  });

  // Seeds the shuffling of options and letters. Generated here so the client
  // has nothing impure to call during render, and so a second run of the same
  // training asks the same words differently.
  return NextResponse.json({
    words,
    pool,
    seed: crypto.randomUUID(),
    onDemandAudioEnabled: process.env.TTS_ON_DEMAND_ENABLED === "true",
    ...(sitting ? { sitting } : {}),
    ...(nextDueAt ? { nextDueAt } : {}),
  });
}
