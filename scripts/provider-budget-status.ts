import { config } from "dotenv";

import {
  activeGlobalTtsLimits,
  GLOBAL_TTS_USAGE_USER_ID,
} from "@/lib/audio/budget";
import {
  activeGlobalLimits,
  GLOBAL_LLM_USAGE_USER_ID,
} from "@/lib/llm/budget";
import { getPrisma } from "@/lib/prisma";

config({ path: [".env.local", ".env"] });

function requestedDay(argv: readonly string[]): string {
  const index = argv.indexOf("--day");
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (index >= 0) throw new Error("--day must be followed by YYYY-MM-DD.");
  return new Date().toISOString().slice(0, 10);
}

function scope(userId: string, globalId: string): string {
  return userId === globalId ? "global" : `user:${userId}`;
}

async function main(): Promise<void> {
  const day = requestedDay(process.argv);
  const prisma = getPrisma();
  const llmLimits = activeGlobalLimits();
  const ttsLimits = activeGlobalTtsLimits();
  const [llmGlobal, ttsGlobal, llmAlerts, ttsAlerts] = await Promise.all([
    prisma.llmUsage.findUnique({
      where: { userId_day: { userId: GLOBAL_LLM_USAGE_USER_ID, day } },
      select: { requests: true, inputTokens: true, outputTokens: true },
    }),
    prisma.ttsUsage.findUnique({
      where: { userId_day: { userId: GLOBAL_TTS_USAGE_USER_ID, day } },
      select: { requests: true, characters: true },
    }),
    prisma.llmUsage.findMany({
      where: { day, capReachedAt: { not: null } },
      select: {
        userId: true,
        capReachedAt: true,
        capReason: true,
        capAttempts: true,
      },
      orderBy: { capReachedAt: "desc" },
    }),
    prisma.ttsUsage.findMany({
      where: { day, capReachedAt: { not: null } },
      select: {
        userId: true,
        capReachedAt: true,
        capReason: true,
        capAttempts: true,
      },
      orderBy: { capReachedAt: "desc" },
    }),
  ]);

  const exhausted = [
    ...(llmGlobal && llmGlobal.requests >= llmLimits.requests
      ? ["anthropic.requests"]
      : []),
    ...(llmGlobal && llmGlobal.inputTokens >= llmLimits.inputTokens
      ? ["anthropic.inputTokens"]
      : []),
    ...(llmGlobal && llmGlobal.outputTokens >= llmLimits.outputTokens
      ? ["anthropic.outputTokens"]
      : []),
    ...(ttsGlobal && ttsGlobal.requests >= ttsLimits.requests
      ? ["openai-tts.requests"]
      : []),
    ...(ttsGlobal && ttsGlobal.characters >= ttsLimits.characters
      ? ["openai-tts.characters"]
      : []),
  ];

  console.log(JSON.stringify({
    day,
    limits: { anthropic: llmLimits, openaiTts: ttsLimits },
    usage: {
      anthropic: llmGlobal ?? {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
      openaiTts: ttsGlobal ?? { requests: 0, characters: 0 },
    },
    exhausted,
    alerts: [
      ...llmAlerts.map((alert) => ({
        provider: "anthropic",
        scope: scope(alert.userId, GLOBAL_LLM_USAGE_USER_ID),
        reason: alert.capReason,
        attempts: alert.capAttempts,
        reachedAt: alert.capReachedAt,
      })),
      ...ttsAlerts.map((alert) => ({
        provider: "openai-tts",
        scope: scope(alert.userId, GLOBAL_TTS_USAGE_USER_ID),
        reason: alert.capReason,
        attempts: alert.capAttempts,
        reachedAt: alert.capReachedAt,
      })),
    ],
  }, null, 2));

  if (
    exhausted.length > 0 ||
    llmAlerts.length > 0 ||
    ttsAlerts.length > 0
  ) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
