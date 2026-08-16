import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  TtsBudgetExceededError,
} from "@/lib/audio/budget";
import {
  AudioUnavailableError,
  resolveAudio,
} from "@/lib/audio/resolve";
import { jsonError } from "@/lib/i18n/api-error";
import { allowAttemptDurable } from "@/lib/rate-limit";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    text: z.string().trim().min(1).max(200),
  })
  .strict();

async function noStoreError(
  key: "invalidAudioText" | "tooManyAudioRequests" | "audioUnavailable",
  status: number,
  retryAfter?: number,
) {
  const response = await jsonError(key, status);
  response.headers.set("Cache-Control", "no-store");
  if (retryAfter !== undefined) {
    response.headers.set("Retry-After", String(retryAfter));
  }
  return response;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const response = await jsonError("unauthorized", 401);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const userId = session.user.id;

  if (!(await allowAttemptDurable(`audio:${userId}`, 30, 60 * 60 * 1_000))) {
    return noStoreError("tooManyAudioRequests", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreError("invalidAudioText", 400);
  }

  try {
    const audio = await resolveAudio(userId, parsed.data.text);
    return NextResponse.json(audio, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof TtsBudgetExceededError) {
      return noStoreError(
        "tooManyAudioRequests",
        429,
        error.retryAfter,
      );
    }
    if (!(error instanceof AudioUnavailableError)) {
      console.error("On-demand speech failed", error);
    }
    return noStoreError("audioUnavailable", 503);
  }
}
