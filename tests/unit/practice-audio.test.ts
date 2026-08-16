import { describe, expect, it } from "vitest";
import { audioAvailable } from "@/lib/practice/audio-capability";

describe("audioAvailable", () => {
  it("allows a session when Web Speech is ready", () => {
    expect(
      audioAvailable([{ audioUrl: null }, { audioUrl: undefined }], true, false),
    ).toBe(true);
  });

  it("allows a voiceless session when every word has a recording", () => {
    expect(
      audioAvailable(
        [{ audioUrl: "/audio/one.mp3" }, { audioUrl: "/audio/two.mp3" }],
        false,
        false,
      ),
    ).toBe(true);
  });

  it("rejects partial or blank recording coverage without Web Speech", () => {
    expect(
      audioAvailable(
        [{ audioUrl: "/audio/one.mp3" }, { audioUrl: null }],
        false,
        false,
      ),
    ).toBe(false);
    expect(audioAvailable([{ audioUrl: "  " }], false, false)).toBe(false);
  });

  it("allows a voiceless session when runtime audio is enabled", () => {
    expect(audioAvailable([{ audioUrl: null }], false, true)).toBe(true);
  });
});
