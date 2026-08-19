import { describe, expect, it } from "vitest";
import type { Annotation, Paragraph } from "@/content/stories/schema";
import {
  buildParagraphSegments,
  dictionaryStateOf,
} from "@/lib/stories/reader-view";

function annotation(overrides: Partial<Annotation> & Pick<Annotation, "id">): Annotation {
  return {
    paragraphId: "p1",
    surface: "key",
    occurrence: 1,
    lemma: "key",
    glossRu: "ключ",
    role: "focus",
    ...overrides,
  };
}

describe("buildParagraphSegments", () => {
  const paragraph: Paragraph = {
    id: "p1",
    text: "She could not find her key anywhere near the door.",
  };

  it("splits plain text around a single annotation", () => {
    const segments = buildParagraphSegments(paragraph, [
      annotation({ id: "a-key", surface: "key" }),
    ]);
    expect(segments).toEqual([
      { kind: "text", text: "She could not find her " },
      { kind: "annotation", text: "key", annotation: expect.objectContaining({ id: "a-key" }) },
      { kind: "text", text: " anywhere near the door." },
    ]);
  });

  it("ignores annotations belonging to a different paragraph", () => {
    const segments = buildParagraphSegments(paragraph, [
      annotation({ id: "a-other", paragraphId: "p2" }),
    ]);
    expect(segments).toEqual([{ kind: "text", text: paragraph.text }]);
  });

  it("drops an annotation whose surface does not resolve", () => {
    const segments = buildParagraphSegments(paragraph, [
      annotation({ id: "a-missing", surface: "lamp" }),
    ]);
    expect(segments).toEqual([{ kind: "text", text: paragraph.text }]);
  });

  it("keeps the outer phrase and absorbs the annotation nested inside it", () => {
    const segments = buildParagraphSegments(paragraph, [
      annotation({ id: "a-key", surface: "key", role: "focus" }),
      annotation({
        id: "a-phrase",
        surface: "key anywhere",
        role: "phrase",
      }),
    ]);
    const annotationSegments = segments.filter((s) => s.kind === "annotation");
    expect(annotationSegments).toHaveLength(1);
    expect(annotationSegments[0]).toEqual({
      kind: "annotation",
      text: "key anywhere",
      annotation: expect.objectContaining({ id: "a-phrase" }),
    });
  });

  it("orders multiple non-overlapping annotations left to right", () => {
    const segments = buildParagraphSegments(paragraph, [
      annotation({ id: "a-door", surface: "door" }),
      annotation({ id: "a-key", surface: "key" }),
    ]);
    const ids = segments
      .filter((s) => s.kind === "annotation")
      .map((s) => (s.kind === "annotation" ? s.annotation.id : null));
    expect(ids).toEqual(["a-key", "a-door"]);
  });
});

describe("dictionaryStateOf", () => {
  it("is absent when there is no record", () => {
    expect(dictionaryStateOf(undefined)).toBe("absent");
  });

  it("is learning for a row that has never been studied (rating 1)", () => {
    expect(dictionaryStateOf({ introducedAt: null, intervalDays: 0 })).toBe(
      "learning",
    );
  });

  it("is learning for a row below the learned interval", () => {
    expect(
      dictionaryStateOf({ introducedAt: new Date(), intervalDays: 10 }),
    ).toBe("learning");
  });

  it("is known once the interval reaches the learned threshold", () => {
    expect(
      dictionaryStateOf({ introducedAt: new Date(), intervalDays: 21 }),
    ).toBe("known");
  });
});
