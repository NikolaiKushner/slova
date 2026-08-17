import { z } from "zod";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { recordTranslations } from "@/lib/lexicon/write";
import { BudgetExceededError, recordUsage } from "@/lib/llm/budget";
import {
  emptyBatchOutcome,
  translateBatch,
} from "@/lib/llm/translate-batch";
import { allowAttemptDurable } from "@/lib/rate-limit";
import {
  reportServerFailure,
  reportServerMetric,
} from "@/lib/server-metrics";

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
  const startedAt = performance.now();
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

  const outcome = emptyBatchOutcome();
  const encoder = new TextEncoder();

  // Both writes maintain shared aggregates rather than the response the user
  // is waiting for. Next keeps this invocation alive after the NDJSON stream
  // finishes, so cache and metric failures remain visible without delaying it.
  after(async () => {
    const responseLatencyMs = Math.round(performance.now() - startedAt);
    const total = outcome.usage.lexiconHits + outcome.usage.llmMisses;
    reportServerMetric("translation.batch", {
      lexiconHits: outcome.usage.lexiconHits,
      llmMisses: outcome.usage.llmMisses,
      lexiconHitRate: total === 0 ? 0 : outcome.usage.lexiconHits / total,
      modelMissRate: total === 0 ? 0 : outcome.usage.llmMisses / total,
      lookupLatencyMs: outcome.lookupLatencyMs,
      modelLatencyMs: outcome.modelLatencyMs,
      translationLatencyMs: responseLatencyMs,
    });

    const maintenance = [
      recordUsage(userId, {
        lexiconHits: outcome.usage.lexiconHits,
        llmMisses: outcome.usage.llmMisses,
      }),
    ];
    if (outcome.cacheWrites.length > 0) {
      maintenance.push(
        recordTranslations(outcome.cacheWrites, { userId }).then(() => {}),
      );
    }
    const results = await Promise.allSettled(maintenance);
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        reportServerFailure(
          index === 0 ? "translation.usage.failed" : "lexicon.write.failed",
          result.reason,
        );
      }
    }
  });

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
