export const TTS_MODEL = "tts-1";
export const TTS_VOICE = "alloy";
export const TTS_SOURCE = `openai:${TTS_MODEL}:${TTS_VOICE}`;
/** Bump when model, voice, speed, or encoding changes. */
export const AUDIO_PROFILE_VERSION = "v1";

export type AudioProfile = {
  model: typeof TTS_MODEL;
  voice: typeof TTS_VOICE;
  source: typeof TTS_SOURCE;
  speed?: number;
};

export const NORMAL_AUDIO_PROFILE = {
  model: TTS_MODEL,
  voice: TTS_VOICE,
  source: TTS_SOURCE,
} satisfies AudioProfile;

export const SLOW_AUDIO_PROFILE = {
  ...NORMAL_AUDIO_PROFILE,
  speed: 0.7,
} satisfies AudioProfile;

export const AUDIO_PROFILES = {
  normal: NORMAL_AUDIO_PROFILE,
  slow: SLOW_AUDIO_PROFILE,
} as const;

export type AudioProfileName = keyof typeof AUDIO_PROFILES;
