import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AudioListener = () => void;

function installBrowser(
  recordingFails = false,
  errorBeforePlayReject = false,
) {
  const audioInstances: MockAudio[] = [];

  class MockAudio {
    preload = "";
    playbackRate = 1;
    readonly listeners = new Map<string, AudioListener[]>();

    constructor(readonly src: string) {
      audioInstances.push(this);
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) {
      const callback =
        typeof listener === "function"
          ? () => listener({} as Event)
          : () => listener.handleEvent({} as Event);
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
    }

    play = vi.fn(() => {
      if (!recordingFails) return Promise.resolve();
      if (errorBeforePlayReject) this.emit("error");
      return Promise.reject(new Error("recording unavailable"));
    });

    emit(type: string) {
      for (const listener of this.listeners.get(type) ?? []) listener();
    }
  }

  class MockUtterance {
    lang = "";
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    onstart: ((event: Event) => void) | null = null;
    onend: ((event: Event) => void) | null = null;
    onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

    constructor(readonly text: string) {}
  }

  const voice = {
    default: true,
    lang: "en-US",
    localService: true,
    name: "Test English",
    voiceURI: "test",
  } as SpeechSynthesisVoice;

  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    resume: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [voice]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    speak: vi.fn((utterance: MockUtterance) => {
      utterance.onstart?.({} as Event);
    }),
  };

  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  vi.stubGlobal("window", { speechSynthesis: synth });

  return { audioInstances, synth };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("resolveOnDemandAudio", () => {
  it("deduplicates normalized requests and caches their URL", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ url: "/audio/runtime-word.mp3", source: "synthesized" }),
    );
    const { resolveOnDemandAudio } = await import("@/lib/practice/speech");

    const first = resolveOnDemandAudio("  Word ", { fetcher });
    const duplicate = resolveOnDemandAudio("word", { fetcher });

    expect(duplicate).toBe(first);
    await expect(first).resolves.toBe("/audio/runtime-word.mp3");
    await expect(
      resolveOnDemandAudio("WORD", { fetcher }),
    ).resolves.toBe("/audio/runtime-word.mp3");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("aborts and resolves null after the bounded timeout", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    const { resolveOnDemandAudio } = await import("@/lib/practice/speech");

    const resolved = resolveOnDemandAudio("word", {
      fetcher,
      timeoutMs: 25,
    });
    await vi.advanceTimersByTimeAsync(25);

    await expect(resolved).resolves.toBeNull();
  });
});

describe("speak", () => {
  it("prefers a recording over speech synthesis", async () => {
    const browser = installBrowser();
    const { speak } = await import("@/lib/practice/speech");

    await expect(speak("word", "/audio/word.mp3")).resolves.toBe(true);

    expect(browser.audioInstances[0]?.src).toBe("/audio/word.mp3");
    expect(browser.synth.speak).not.toHaveBeenCalled();
  });

  it("falls back to speech synthesis when a recording fails", async () => {
    const browser = installBrowser(true);
    const { speak } = await import("@/lib/practice/speech");

    await expect(speak("word", "/audio/missing.mp3")).resolves.toBe(true);

    expect(browser.audioInstances[0]?.play).toHaveBeenCalledOnce();
    expect(browser.synth.speak).toHaveBeenCalledOnce();
  });

  it("does not finish fallback when media errors before play rejects", async () => {
    const browser = installBrowser(true, true);
    const onEnd = vi.fn();
    const { speak } = await import("@/lib/practice/speech");

    await expect(
      speak("word", "/audio/missing.mp3", { onEnd }),
    ).resolves.toBe(true);

    expect(onEnd).not.toHaveBeenCalled();
    expect(browser.synth.speak).toHaveBeenCalledOnce();
  });

  it("uses runtime audio only when opted in and static audio is absent", async () => {
    const browser = installBrowser();
    const fetcher = vi.fn(async () =>
      Response.json({ url: "/audio/runtime.mp3", source: "synthesized" }),
    );
    vi.stubGlobal("fetch", fetcher);
    const { speak } = await import("@/lib/practice/speech");

    await expect(speak("word", null, { onDemand: true })).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(browser.audioInstances[0]?.src).toBe("/audio/runtime.mp3");
    expect(browser.synth.speak).not.toHaveBeenCalled();
  });

  it("never requests runtime audio when a static URL exists", async () => {
    installBrowser();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { speak } = await import("@/lib/practice/speech");

    await speak("word", "/audio/static.mp3", { onDemand: true });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("falls back to Web Speech when runtime resolution fails", async () => {
    const browser = installBrowser();
    vi.stubGlobal("fetch", vi.fn(async () => Response.error()));
    const { speak } = await import("@/lib/practice/speech");

    await expect(speak("word", null, { onDemand: true })).resolves.toBe(true);

    expect(browser.synth.speak).toHaveBeenCalledOnce();
  });

  it("keeps a purpose-made slow recording at its authored speed", async () => {
    const browser = installBrowser();
    const { speak } = await import("@/lib/practice/speech");

    await speak("word", "/audio/word-slow.mp3", {
      rate: 0.6,
      recordingRate: 1,
    });

    expect(browser.audioInstances[0]?.playbackRate).toBe(1);
  });

  it("plays the normal recording at 0.7 when slow audio is unavailable", async () => {
    const browser = installBrowser();
    const { speak } = await import("@/lib/practice/speech");

    await speak("word", "/audio/word.mp3", {
      rate: 0.6,
      recordingRate: 0.7,
    });

    expect(browser.audioInstances[0]?.playbackRate).toBe(0.7);
  });

  it("keeps the slow rate when a recording falls back to Web Speech", async () => {
    const browser = installBrowser(true);
    const { speak } = await import("@/lib/practice/speech");

    await speak("word", "/audio/missing.mp3", {
      rate: 0.6,
      recordingRate: 1,
    });

    const utterance = browser.synth.speak.mock.calls[0]?.[0];
    expect(utterance?.rate).toBe(0.6);
  });

  it("fires onEnd only once when media emits multiple terminal events", async () => {
    const browser = installBrowser();
    const onEnd = vi.fn();
    const { speak } = await import("@/lib/practice/speech");

    await speak("word", "/audio/word.mp3", { onEnd });
    browser.audioInstances[0]?.emit("ended");
    browser.audioInstances[0]?.emit("error");

    expect(onEnd).toHaveBeenCalledOnce();
  });
});
