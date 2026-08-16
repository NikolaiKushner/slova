import {
  recordTtsMetrics,
  reserveTtsUsage,
} from "@/lib/audio/budget";
import {
  audioGenerationClaimKey,
  runtimeAudioObjectKey,
} from "@/lib/audio/object-key";
import { NORMAL_AUDIO_PROFILE } from "@/lib/audio/profile";
import { createR2Storage, readR2Config } from "@/lib/audio/r2";
import { synthesizeSpeech } from "@/lib/audio/tts";
import { STUDY_SOURCE_LANG } from "@/lib/languages";
import { normalizeKey } from "@/lib/lexicon/key";
import { getPrisma } from "@/lib/prisma";
import { allowAttemptDurable } from "@/lib/rate-limit";

export class AudioUnavailableError extends Error {
  constructor(message = "On-demand speech is unavailable.") {
    super(message);
    this.name = "AudioUnavailableError";
  }
}

export type ResolvedAudio = {
  url: string;
  source: "cache" | "synthesized";
};

type LexemeAudio = {
  audioUrl: string | null;
  text: string;
};

export type ResolveAudioDependencies = {
  findLexeme(key: string): Promise<LexemeAudio | null>;
  claimGeneration(key: string): Promise<boolean>;
  sleep(milliseconds: number): Promise<void>;
  reserve(userId: string, characters: number): Promise<void>;
  record(userId: string, delta: {
    cacheHits?: number;
    syntheses?: number;
  }): Promise<void>;
  validatePaidPath(): void;
  synthesize(text: string): Promise<Uint8Array>;
  upload(path: string, audio: Uint8Array): Promise<string>;
  storeLexeme(input: {
    key: string;
    text: string;
    audioUrl: string;
  }): Promise<void>;
};

function defaultDependencies(): ResolveAudioDependencies {
  return {
    async findLexeme(key) {
      return getPrisma().lexeme.findUnique({
        where: { lang_key: { lang: STUDY_SOURCE_LANG, key } },
        select: { audioUrl: true, text: true },
      });
    },
    claimGeneration(key) {
      return allowAttemptDurable(audioGenerationClaimKey(key), 1, 30_000);
    },
    sleep(milliseconds) {
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
    reserve: reserveTtsUsage,
    record: recordTtsMetrics,
    validatePaidPath() {
      if (!process.env.OPENAI_API_KEY) {
        throw new AudioUnavailableError("OPENAI_API_KEY is not configured.");
      }
      readR2Config();
    },
    async synthesize(text) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new AudioUnavailableError();
      return synthesizeSpeech(text, { apiKey });
    },
    async upload(path, audio) {
      return createR2Storage().putAudio(path, audio);
    },
    async storeLexeme({ key, text, audioUrl }) {
      await getPrisma().lexeme.upsert({
        where: { lang_key: { lang: STUDY_SOURCE_LANG, key } },
        create: {
          lang: STUDY_SOURCE_LANG,
          key,
          text,
          kind: key.includes(" ") ? "phrase" : "word",
          source: "tts",
          audioUrl,
          audioSource: NORMAL_AUDIO_PROFILE.source,
        },
        update: {
          audioUrl,
          audioSource: NORMAL_AUDIO_PROFILE.source,
        },
      });
    },
  };
}

const CLAIM_RECHECKS = 12;
const CLAIM_RECHECK_DELAY_MS = 250;

async function findClaimWinnerAudio(
  key: string,
  dependencies: ResolveAudioDependencies,
): Promise<LexemeAudio | null> {
  for (let attempt = 0; attempt < CLAIM_RECHECKS; attempt += 1) {
    await dependencies.sleep(CLAIM_RECHECK_DELAY_MS);
    const lexeme = await dependencies.findLexeme(key);
    if (lexeme?.audioUrl) return lexeme;
  }
  return null;
}

/**
 * Resolves exactly one explicit text. The shared Lexeme audio is checked before
 * feature flags, budget reservations, provider configuration, or paid work.
 */
export async function resolveAudio(
  userId: string,
  rawText: string,
  {
    environment = process.env,
    dependencies = defaultDependencies(),
  }: {
    environment?: Record<string, string | undefined>;
    dependencies?: ResolveAudioDependencies;
  } = {},
): Promise<ResolvedAudio> {
  const text = rawText.normalize("NFC").replace(/\s+/gu, " ").trim();
  const key = normalizeKey(text);
  if (!key) throw new AudioUnavailableError("Speech text is empty.");

  const cached = await dependencies.findLexeme(key);
  if (cached?.audioUrl) {
    await dependencies.record(userId, { cacheHits: 1 });
    return { url: cached.audioUrl, source: "cache" };
  }

  if (environment.TTS_ON_DEMAND_ENABLED !== "true") {
    throw new AudioUnavailableError();
  }

  dependencies.validatePaidPath();

  if (!(await dependencies.claimGeneration(key))) {
    const generated = await findClaimWinnerAudio(key, dependencies);
    if (generated?.audioUrl) {
      await dependencies.record(userId, { cacheHits: 1 });
      return { url: generated.audioUrl, source: "cache" };
    }
    throw new AudioUnavailableError("Speech generation is already in progress.");
  }

  // Existing entries keep their curated spelling. A new entry uses the safe
  // normalized key, never list markers or punctuation stripped by normalizeKey.
  const synthesisText = cached?.text ?? key;
  await dependencies.reserve(userId, synthesisText.length);

  const path = runtimeAudioObjectKey(synthesisText);
  const audio = await dependencies.synthesize(synthesisText);
  const audioUrl = await dependencies.upload(path, audio);
  await dependencies.storeLexeme({ key, text: synthesisText, audioUrl });
  await dependencies.record(userId, { syntheses: 1 });

  return { url: audioUrl, source: "synthesized" };
}
