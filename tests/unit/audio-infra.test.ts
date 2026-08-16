import { describe, expect, it, vi } from "vitest";

import {
  NORMAL_AUDIO_PROFILE,
  SLOW_AUDIO_PROFILE,
} from "@/lib/audio/profile";
import { runtimeAudioObjectKey } from "@/lib/audio/object-key";
import { createR2Storage } from "@/lib/audio/r2";
import { synthesizeSpeech } from "@/lib/audio/tts";

describe("synthesizeSpeech", () => {
  it("sends the current normal OpenAI speech payload without speed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );

    const audio = await synthesizeSpeech("hello", {
      apiKey: "test-key",
      fetch: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/speech",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        },
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      model: "tts-1",
      voice: "alloy",
      input: "hello",
    });
    expect(audio).toEqual(Buffer.from([1, 2, 3]));
    expect(NORMAL_AUDIO_PROFILE.source).toBe("openai:tts-1:alloy");
  });

  it("adds speed only for the slow profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array()));

    await synthesizeSpeech("slowly", {
      apiKey: "test-key",
      profile: SLOW_AUDIO_PROFILE,
      fetch: fetchMock,
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      model: "tts-1",
      voice: "alloy",
      input: "slowly",
      speed: 0.7,
    });
  });
});

describe("createR2Storage", () => {
  const completeEnvironment = {
    R2_ACCOUNT_ID: "account",
    R2_ACCESS_KEY_ID: "access",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_PUBLIC_URL: "https://audio.example.test/",
    R2_BUCKET: "audio",
  };

  it("rejects incomplete storage configuration before creating a client", () => {
    const clientFactory = vi.fn();

    expect(() =>
      createR2Storage(
        {
          R2_ACCOUNT_ID: "account",
          R2_ACCESS_KEY_ID: "access",
          R2_SECRET_ACCESS_KEY: "secret",
        },
        clientFactory,
      ),
    ).toThrow("R2_PUBLIC_URL is not set");
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("uploads MP3s with immutable caching and returns the public URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const storage = createR2Storage(completeEnvironment, () => ({
      fetch: fetchMock,
    }));

    await expect(
      storage.putAudio("lexicon/hello.mp3", new Uint8Array([1])),
    ).resolves.toBe("https://audio.example.test/lexicon/hello.mp3");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.r2.cloudflarestorage.com/audio/lexicon/hello.mp3",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
    );
  });
});

describe("runtimeAudioObjectKey", () => {
  it("uses a versioned profile path without exposing the raw key", () => {
    const path = runtimeAudioObjectKey("1. hello/../secret");

    expect(path).toMatch(/^audio\/runtime\/v1\/normal\/[a-f0-9]{64}\.mp3$/u);
    expect(path).not.toContain("hello");
    expect(path).not.toContain("..");
  });
});
