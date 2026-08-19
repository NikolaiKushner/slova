import { describe, expect, it } from "vitest";
import {
  blueprintSchema,
  storyFileSchema,
  type StoryFile,
} from "@/content/stories/schema";
import {
  StoryContentError,
  resolveAnnotationSpan,
  validateStory,
} from "@/lib/stories/validate";

/**
 * A structurally and content-valid story: 6 focus annotations, no
 * overlaps, questions in choice/choice/gap order, cloze answer a focus
 * lemma not quoted verbatim in the text. Tests mutate a fresh clone.
 */
function buildStory(): StoryFile {
  return {
    slug: "missing-key",
    schemaVersion: 1,
    level: "A1",
    topic: "daily-life",
    blueprint: "missing-key",
    title: "The Missing Key",
    descriptionRu: "Анна опаздывает и не может найти ключ.",
    paragraphs: [
      {
        id: "p1",
        text: "Anna woke up late on a rainy Monday morning in October. She looked at the clock on the wall and could not believe her eyes. It was already half past eight, and her train left at nine. She jumped out of bed, grabbed some clothes, and ran to the bathroom without turning on the light.",
      },
      {
        id: "p2",
        text: "In the kitchen she found her bag but could not find her key anywhere. She checked the table, the sofa, and even the pockets of her old coat. Her flatmate was still asleep, so she did not want to shout. She felt her heart beating faster with every passing minute.",
      },
      {
        id: "p3",
        text: "Finally she remembered leaving the key on the shelf by the front door the night before, next to a small green plant. She grabbed it, locked the door behind her, and ran down the stairs two at a time. She reached the station just as the train doors began to close.",
      },
    ],
    annotations: [
      {
        id: "a-key",
        paragraphId: "p2",
        surface: "key",
        occurrence: 1,
        lemma: "key",
        glossRu: "ключ",
        role: "focus",
      },
      {
        id: "a-shout",
        paragraphId: "p2",
        surface: "shout",
        occurrence: 1,
        lemma: "shout",
        glossRu: "кричать",
        role: "focus",
      },
      {
        id: "a-beating",
        paragraphId: "p2",
        surface: "beating",
        occurrence: 1,
        lemma: "beat",
        glossRu: "биться",
        role: "focus",
      },
      {
        id: "a-remembered",
        paragraphId: "p3",
        surface: "remembered",
        occurrence: 1,
        lemma: "remember",
        glossRu: "вспомнить",
        role: "focus",
      },
      {
        id: "a-locked",
        paragraphId: "p3",
        surface: "locked",
        occurrence: 1,
        lemma: "lock",
        glossRu: "запереть",
        role: "focus",
      },
      {
        id: "a-grabbed",
        paragraphId: "p1",
        surface: "grabbed",
        occurrence: 1,
        lemma: "grab",
        glossRu: "схватить",
        role: "focus",
      },
    ],
    questions: [
      {
        type: "exercise",
        id: "q-morning",
        ruleId: "story",
        kind: "choice",
        prompt: "Why did Anna jump out of bed?",
        options: [
          "She woke up late.",
          "She heard a noise.",
          "She smelled smoke.",
        ],
        answer: "She woke up late.",
      },
      {
        type: "exercise",
        id: "q-key",
        ruleId: "story",
        kind: "choice",
        prompt: "Where did Anna find her key?",
        options: [
          "On the shelf by the door.",
          "In her coat pocket.",
          "On the kitchen table.",
        ],
        answer: "On the shelf by the door.",
      },
      {
        type: "exercise",
        id: "q-cloze",
        ruleId: "story",
        kind: "gap",
        prompt: "Anna could not find her ___ before running to catch the train.",
        answer: "key",
      },
    ],
  };
}

describe("storyFileSchema", () => {
  it("parses a valid story", () => {
    const parsed = storyFileSchema.safeParse(buildStory());
    expect(parsed.success).toBe(true);
  });

  it("rejects a schemaVersion other than 1", () => {
    const story = { ...buildStory(), schemaVersion: 2 };
    expect(storyFileSchema.safeParse(story).success).toBe(false);
  });

  it("rejects an unknown level", () => {
    const story = { ...buildStory(), level: "B1" };
    expect(storyFileSchema.safeParse(story).success).toBe(false);
  });

  it("rejects fewer than three paragraphs", () => {
    const story = buildStory();
    story.paragraphs = story.paragraphs.slice(0, 2);
    expect(storyFileSchema.safeParse(story).success).toBe(false);
  });

  it("rejects more than five paragraphs", () => {
    const story = buildStory();
    story.paragraphs = [
      ...story.paragraphs,
      { id: "p4", text: "Extra." },
      { id: "p5", text: "Extra." },
      { id: "p6", text: "Extra." },
    ];
    expect(storyFileSchema.safeParse(story).success).toBe(false);
  });
});

describe("blueprintSchema", () => {
  it("parses a valid blueprint", () => {
    const parsed = blueprintSchema.safeParse({
      slug: "missing-key",
      level: "A1",
      topic: "daily-life",
      premise: "Anna is running late and cannot find her key.",
      focusLemmas: ["key", "shout", "beat", "remember", "lock"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects fewer than five focus lemmas", () => {
    const parsed = blueprintSchema.safeParse({
      slug: "missing-key",
      level: "A1",
      topic: "daily-life",
      premise: "Anna is running late and cannot find her key.",
      focusLemmas: ["key", "shout"],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects more than eight focus lemmas", () => {
    const parsed = blueprintSchema.safeParse({
      slug: "missing-key",
      level: "A1",
      topic: "daily-life",
      premise: "Anna is running late and cannot find her key.",
      focusLemmas: Array.from({ length: 9 }, (_, i) => `word-${i}`),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("resolveAnnotationSpan", () => {
  it("resolves the first occurrence", () => {
    expect(resolveAnnotationSpan("the key is on the table", "the", 1)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("resolves a later occurrence", () => {
    expect(resolveAnnotationSpan("the key is on the table", "the", 2)).toEqual({
      start: 14,
      end: 17,
    });
  });

  it("returns null when the occurrence does not exist", () => {
    expect(resolveAnnotationSpan("the key is on the table", "the", 3)).toBeNull();
  });

  it("returns null when the surface never occurs", () => {
    expect(resolveAnnotationSpan("the key is on the table", "lamp", 1)).toBeNull();
  });
});

describe("validateStory", () => {
  it("accepts the valid fixture", () => {
    expect(() => validateStory(buildStory())).not.toThrow();
  });

  it("rejects a story under 120 words", () => {
    const story = buildStory();
    story.paragraphs = [
      { id: "p1", text: "Anna woke up late." },
      { id: "p2", text: "She could not find her key." },
      { id: "p3", text: "She ran to the station." },
    ];
    expect(() => validateStory(story)).toThrow(StoryContentError);
    expect(() => validateStory(story)).toThrow(/120-180 words/);
  });

  it("rejects Russian text in a paragraph", () => {
    const story = buildStory();
    story.paragraphs[0]!.text += " Привет.";
    expect(() => validateStory(story)).toThrow(/Russian/);
  });

  it("rejects a duplicate id across paragraphs, annotations and questions", () => {
    const story = buildStory();
    story.annotations[0]!.id = "p1";
    expect(() => validateStory(story)).toThrow(/duplicate id/);
  });

  it("rejects fewer than five focus annotations", () => {
    const story = buildStory();
    story.annotations = story.annotations.slice(0, 3);
    expect(() => validateStory(story)).toThrow(/5-8 focus annotations/);
  });

  it("rejects an annotation whose surface does not occur that many times", () => {
    const story = buildStory();
    story.annotations[0]!.occurrence = 5;
    expect(() => validateStory(story)).toThrow(/not found in paragraph/);
  });

  it("rejects overlapping spans unless the outer one is a phrase", () => {
    const story = buildStory();
    story.annotations.push({
      id: "a-anywhere",
      paragraphId: "p2",
      surface: "key anywhere",
      occurrence: 1,
      lemma: "key anywhere",
      glossRu: "ключ где-то",
      role: "support",
    });
    expect(() => validateStory(story)).toThrow(/overlap/);
  });

  it("allows overlapping spans when the outer one is a phrase", () => {
    const story = buildStory();
    story.annotations.push({
      id: "a-anywhere",
      paragraphId: "p2",
      surface: "key anywhere",
      occurrence: 1,
      lemma: "key anywhere",
      glossRu: "ключ где-то",
      role: "phrase",
    });
    expect(() => validateStory(story)).not.toThrow();
  });

  it("rejects questions not in choice, choice, gap order", () => {
    const story = buildStory();
    const [q1, q2, q3] = story.questions;
    story.questions = [q3, q1, q2];
    expect(() => validateStory(story)).toThrow(/choice, choice, gap/);
  });

  it("rejects a choice question with a duplicate option", () => {
    const story = buildStory();
    const first = story.questions[0];
    if (first.kind === "choice") {
      first.options = [first.answer, first.answer, "Other."];
    }
    expect(() => validateStory(story)).toThrow(/repeats an option/);
  });

  it("rejects a choice question whose answer is not among its options", () => {
    const story = buildStory();
    const first = story.questions[0];
    if (first.kind === "choice") {
      first.answer = "Not an option.";
    }
    expect(() => validateStory(story)).toThrow(/not among its options/);
  });

  it("rejects a cloze prompt that quotes the story verbatim", () => {
    const story = buildStory();
    const cloze = story.questions[2];
    if (cloze.kind === "gap") {
      cloze.prompt = "She checked the table, the sofa, and even the pockets of her old coat.";
    }
    expect(() => validateStory(story)).toThrow(/appears verbatim/);
  });

  it("rejects a cloze answer that is not a focus lemma", () => {
    const story = buildStory();
    const cloze = story.questions[2];
    if (cloze.kind === "gap") {
      cloze.answer = "umbrella";
    }
    expect(() => validateStory(story)).toThrow(/not a focus lemma/);
  });
});
