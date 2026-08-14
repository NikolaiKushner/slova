import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { BudgetExceededError, recordUsage } from "@/lib/llm/budget";
import { emptyUsage, translateBatch } from "@/lib/llm/translate-batch";
import { allowAttemptDurable } from "@/lib/rate-limit";

/**
 * Translate a list, streaming each row back as it is ready.
 *
 * NDJSON rather than Server-Sent Events: the client wants rows, not an event
 * protocol, and one JSON object per line is the least machinery that delivers
 * them incrementally. Node runtime, not Edge — streaming works there without
 * configuration, and the Prisma client the lexicon lookup needs runs there.
 */
export const runtime = "nodejs";

const schema = z.object({
  words: z.array(z.string().min(1).max(500)).min(1).max(200),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  if (!(await allowAttemptDurable(`translate:${userId}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many translation requests. Try again in a while." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a list of words." }, { status: 400 });
  }

  const outcome = { usage: emptyUsage() };
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const row of translateBatch(parsed.data.words, outcome, {
          userId,
        })) {
          controller.enqueue(encoder.encode(JSON.stringify(row) + "\n"));
        }
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ error: error.message }) + "\n",
            ),
          );
        } else {
          const message =
            error instanceof Error ? error.message : "Translation failed";
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: message }) + "\n"),
          );
        }
      } finally {
        try {
          await recordUsage(userId, { ...outcome.usage, requests: 0 });
        } catch (error) {
          console.error("Failed to record translation usage", error);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Nothing between us and the browser should hold the rows back.
      "X-Accel-Buffering": "no",
    },
  });
}
