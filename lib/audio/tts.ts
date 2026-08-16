import {
  NORMAL_AUDIO_PROFILE,
  type AudioProfile,
} from "@/lib/audio/profile";

type Fetch = typeof globalThis.fetch;

type SynthesizeSpeechOptions = {
  apiKey: string;
  profile?: AudioProfile;
  fetch?: Fetch;
};

export async function synthesizeSpeech(
  input: string,
  {
    apiKey,
    profile = NORMAL_AUDIO_PROFILE,
    fetch: fetchImpl = globalThis.fetch,
  }: SynthesizeSpeechOptions,
): Promise<Buffer> {
  const response = await fetchImpl("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      voice: profile.voice,
      input,
      ...(profile.speed === undefined ? {} : { speed: profile.speed }),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${detail.slice(0, 200)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
