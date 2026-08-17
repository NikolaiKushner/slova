import { z } from "zod";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
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

/**
 * The request size stays deliberately small even though the paid path now
 * reserves counted input tokens and the full output ceiling atomically. It
 * keeps latency and a single failed reservation bounded; a vocabulary entry
 * longer than 64 characters is not a vocabulary entry.
 */
const schema = z.object({
  words: z.array(z.string().min(1).max(64)).min(1).max(100),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;
  if (!(await allowAttemptDurable(`translate:${userId}`, 30, 60 * 60 * 1000))) {
    return jsonError("tooManyTranslations", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("sendList", 400);
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
          console.error("Translation failed", error);
          const t = await getTranslations("api");
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ error: t("translationFailed") }) + "\n",
            ),
          );
        }
      } finally {
        try {
          await recordUsage(userId, {
            lexiconHits: outcome.usage.lexiconHits,
            llmMisses: outcome.usage.llmMisses,
          });
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
