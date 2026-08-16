import { describe, expect, it, vi } from "vitest";

import {
  AudioUnavailableError,
  resolveAudio,
  type ResolveAudioDependencies,
} from "@/lib/audio/resolve";

function dependencies(
  overrides: Partial<ResolveAudioDependencies> = {},
): ResolveAudioDependencies {
  return {
    findLexeme: vi.fn().mockResolvedValue(null),
    claimGeneration: vi.fn().mockResolvedValue(true),
    sleep: vi.fn().mockResolvedValue(undefined),
    reserve: vi.fn().mockResolvedValue(undefined),
    record: vi.fn().mockResolvedValue(undefined),
    validatePaidPath: vi.fn(),
    synthesize: vi.fn().mockResolvedValue(new Uint8Array([1, 2])),
    upload: vi.fn().mockResolvedValue("https://audio.test/hello.mp3"),
    storeLexeme: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("resolveAudio", () => {
  it("synthesizes once, stores after upload, then serves the shared cache", async () => {
    let cachedUrl: string | null = null;
    const order: string[] = [];
    const deps = dependencies({
      findLexeme: vi.fn(async () =>
        cachedUrl ? { audioUrl: cachedUrl, text: "Hello" } : null,
      ),
      synthesize: vi.fn(async () => {
        order.push("synthesize");
        return new Uint8Array([1]);
      }),
      upload: vi.fn(async () => {
        order.push("upload");
        return "https://audio.test/hello.mp3";
      }),
      storeLexeme: vi.fn(async ({ audioUrl }) => {
        order.push("store");
        cachedUrl = audioUrl;
      }),
    });

    await expect(
      resolveAudio("user-1", "  Hello  ", {
        environment: { TTS_ON_DEMAND_ENABLED: "true" },
        dependencies: deps,
      }),
    ).resolves.toEqual({
      url: "https://audio.test/hello.mp3",
      source: "synthesized",
    });
    await expect(
      resolveAudio("user-1", "hello", {
        environment: { TTS_ON_DEMAND_ENABLED: "false" },
        dependencies: deps,
      }),
    ).resolves.toEqual({
      url: "https://audio.test/hello.mp3",
      source: "cache",
    });

    expect(order).toEqual(["synthesize", "upload", "store"]);
    expect(deps.reserve).toHaveBeenCalledTimes(1);
    expect(deps.synthesize).toHaveBeenCalledTimes(1);
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(deps.record).toHaveBeenNthCalledWith(1, "user-1", {
      syntheses: 1,
    });
    expect(deps.record).toHaveBeenNthCalledWith(2, "user-1", {
      cacheHits: 1,
    });
  });

  it("does not reserve or validate providers when a cache miss is disabled", async () => {
    const deps = dependencies();

    await expect(
      resolveAudio("user-1", "hello", {
        environment: { TTS_ON_DEMAND_ENABLED: "false" },
        dependencies: deps,
      }),
    ).rejects.toBeInstanceOf(AudioUnavailableError);

    expect(deps.reserve).not.toHaveBeenCalled();
    expect(deps.validatePaidPath).not.toHaveBeenCalled();
    expect(deps.synthesize).not.toHaveBeenCalled();
  });

  it("keeps each failed provider attempt reserved", async () => {
    const deps = dependencies({
      synthesize: vi.fn().mockRejectedValue(new Error("provider down")),
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(
        resolveAudio("user-1", "hello", {
          environment: { TTS_ON_DEMAND_ENABLED: "true" },
          dependencies: deps,
        }),
      ).rejects.toThrow("provider down");
    }

    expect(deps.reserve).toHaveBeenCalledTimes(2);
    expect(deps.storeLexeme).not.toHaveBeenCalled();
  });

  it("speaks an existing lexeme's canonical text", async () => {
    const deps = dependencies({
      findLexeme: vi.fn().mockResolvedValue({
        audioUrl: null,
        text: "Hello",
      }),
    });

    await resolveAudio("user-1", "hello.", {
      environment: { TTS_ON_DEMAND_ENABLED: "true" },
      dependencies: deps,
    });

    expect(deps.synthesize).toHaveBeenCalledWith("Hello");
    expect(deps.storeLexeme).toHaveBeenCalledWith(
      expect.objectContaining({ key: "hello", text: "Hello" }),
    );
  });

  it("never speaks or stores a list marker stripped by normalizeKey", async () => {
    const deps = dependencies();

    await resolveAudio("user-1", "1. hello", {
      environment: { TTS_ON_DEMAND_ENABLED: "true" },
      dependencies: deps,
    });

    expect(deps.synthesize).toHaveBeenCalledWith("hello");
    expect(deps.storeLexeme).toHaveBeenCalledWith(
      expect.objectContaining({ key: "hello", text: "hello" }),
    );
    expect(deps.upload).toHaveBeenCalledWith(
      expect.not.stringContaining("1. hello"),
      expect.any(Uint8Array),
    );
  });

  it("waits for a durable claim winner instead of calling the provider twice", async () => {
    let cachedUrl: string | null = null;
    let releaseWaiter: (() => void) | undefined;
    const generated = new Promise<void>((resolve) => {
      releaseWaiter = resolve;
    });
    const deps = dependencies({
      findLexeme: vi.fn(async () =>
        cachedUrl ? { audioUrl: cachedUrl, text: "hello" } : null,
      ),
      claimGeneration: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
      sleep: vi.fn(async () => generated),
      storeLexeme: vi.fn(async ({ audioUrl }) => {
        cachedUrl = audioUrl;
        releaseWaiter?.();
      }),
    });

    const [first, second] = await Promise.all([
      resolveAudio("user-1", "hello", {
        environment: { TTS_ON_DEMAND_ENABLED: "true" },
        dependencies: deps,
      }),
      resolveAudio("user-2", "hello", {
        environment: { TTS_ON_DEMAND_ENABLED: "true" },
        dependencies: deps,
      }),
    ]);

    expect(first.source).toBe("synthesized");
    expect(second.source).toBe("cache");
    expect(deps.synthesize).toHaveBeenCalledTimes(1);
    expect(deps.reserve).toHaveBeenCalledTimes(1);
  });

  it("does not call the provider when budget reservation fails", async () => {
    const deps = dependencies({
      reserve: vi.fn().mockRejectedValue(new Error("global cap")),
    });

    await expect(
      resolveAudio("user-1", "hello", {
        environment: { TTS_ON_DEMAND_ENABLED: "true" },
        dependencies: deps,
      }),
    ).rejects.toThrow("global cap");

    expect(deps.synthesize).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
  });
});
