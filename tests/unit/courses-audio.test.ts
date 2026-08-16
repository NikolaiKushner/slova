import { describe, expect, it } from "vitest";

import {
  parseCourseAudioManifest,
  resolveCourseAudio,
} from "@/lib/courses/audio";
import { courseAudioObjectKey } from "@/lib/courses/audio-key";
import type { LoadedCourse } from "@/lib/courses/load";
import { speakText } from "@/lib/courses/speak-text";
import {
  collectCourseAudioTexts,
  pendingCourseAudio,
} from "@/scripts/build-course-audio";

describe("speakText", () => {
  it("removes only the Markdown supported by course rendering", () => {
    expect(
      speakText("  She **work==s==** and `play==s==`.\nNext line.  "),
    ).toBe("She works and plays. Next line.");
  });

  it("leaves unsupported Markdown untouched", () => {
    expect(speakText("_italic_ [link](https://example.test) ~~old~~")).toBe(
      "_italic_ [link](https://example.test) ~~old~~",
    );
  });
});

describe("course audio corpus", () => {
  it("allows only examples and transform sources and deduplicates plain text", () => {
    const course = {
      lessons: [
        {
          blocks: [
            { type: "example", en: "She work==s==.", ru: "Она работает." },
            { type: "example", en: "She works.", ru: "Она работает." },
            {
              type: "exercise",
              kind: "transform",
              source: "`I work.`",
            },
            {
              type: "exercise",
              kind: "pick-sentence",
              options: ["Wrong.", "Right."],
            },
            { type: "explanation", md: "Never collect me." },
          ],
        },
      ],
      bank: [
        { type: "exercise", kind: "transform", source: "Do you work?" },
        {
          type: "exercise",
          kind: "choice",
          options: ["Never", "collect"],
        },
      ],
    } as unknown as Pick<LoadedCourse, "lessons" | "bank">;

    expect(collectCourseAudioTexts([course])).toEqual([
      "Do you work?",
      "I work.",
      "She works.",
    ]);
  });
});

describe("course audio keys and manifest", () => {
  const normalUrl =
    "https://audio.example.test/audio/courses/hello-normal.mp3";

  it("uses stable SHA-256 keys over normalized plain text", () => {
    expect(courseAudioObjectKey("hello", "normal")).toBe(
      "audio/courses/v1/normal/2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824.mp3",
    );
    expect(courseAudioObjectKey(" **hello** ", "normal")).toBe(
      courseAudioObjectKey("hello", "normal"),
    );
    expect(courseAudioObjectKey("hello", "slow")).not.toBe(
      courseAudioObjectKey("hello", "normal"),
    );
  });

  it("validates normalized manifest entries and computes pending profiles", () => {
    const manifest = parseCourseAudioManifest({
      version: 1,
      source: "openai:tts-1:alloy",
      entries: {
        hello: { text: "hello", normalUrl },
      },
    });

    expect(pendingCourseAudio(["hello"], manifest, false)).toEqual([]);
    expect(pendingCourseAudio(["hello"], manifest, true)).toEqual([
      { text: "hello", profile: "slow" },
    ]);
    expect(() =>
      parseCourseAudioManifest({
        version: 1,
        source: "openai:tts-1:alloy",
        entries: {
          " hello ": { text: "hello", normalUrl },
        },
      }),
    ).toThrow("normalized plain text");
  });

  it("returns no recording from the checked-in empty manifest", () => {
    expect(resolveCourseAudio("not generated yet")).toBeNull();
  });
});

