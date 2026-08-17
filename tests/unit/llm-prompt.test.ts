import { afterEach, describe, expect, it } from "vitest";
import {
  buildTranslationRequest,
  isPartOfSpeech,
  outputCeiling,
  PARTS_OF_SPEECH,
  SYSTEM_PROMPT,
  TRANSLATION_ITEM_DEPTH,
  TRANSLATION_SCHEMA,
  untranslated,
} from "@/lib/llm/prompt";
import { JsonArrayStream } from "@/lib/llm/json-array-stream";
import { DEFAULT_MODEL } from "@/lib/llm/models";

const ROWS = [
  { text: "monitor", translation: "монитор" },
  { text: "discharge summary" },
  { text: "accuracy", translation: "" },
  { text: "was/were" },
];

function userText(request: ReturnType<typeof buildTranslationRequest>): string {
  const content = request.messages[0].content;
  return typeof content === "string" ? content : JSON.stringify(content);
}

afterEach(() => {
  delete process.env.LLM_MODEL;
});

describe("untranslated", () => {
  it("keeps rows with no translation, including blank ones", () => {
    expect(untranslated(ROWS)).toEqual([
      "discharge summary",
      "accuracy",
      "was/were",
    ]);
  });

  it("drops empty rows and repeats — one word costs one entry", () => {
    expect(untranslated([{ text: "cat" }, { text: " " }, { text: "cat" }])).toEqual([
      "cat",
    ]);
  });
});

describe("buildTranslationRequest", () => {
  it("asks about every untranslated word and none of the translated ones", () => {
    const text = userText(buildTranslationRequest(ROWS));
    expect(text).toContain("discharge summary");
    expect(text).toContain("accuracy");
    expect(text).toContain("was/were");
    expect(text).not.toContain("монитор");
  });

  it("sends the words as JSON data, not a markdown list a prompt can hide in", () => {
    const request = buildTranslationRequest(ROWS);
    const text = userText(request);
    expect(request.messages).toHaveLength(1);
    expect(request.system).toBe(SYSTEM_PROMPT);
    expect(text).toContain(JSON.stringify(["discharge summary", "accuracy", "was/were"]));
    expect(text).toMatch(/not instructions/i);
    expect(text).not.toContain("- discharge summary");
  });

  it("omits effort for claude-haiku-4-5 — the parameter is a 400 there", () => {
    const request = buildTranslationRequest(ROWS, { model: "claude-haiku-4-5" });
    expect(request.output_config?.effort).toBeUndefined();
    expect(request.output_config?.format).toEqual({
      type: "json_schema",
      schema: TRANSLATION_SCHEMA,
    });
  });

  it("sends effort for a model that accepts it", () => {
    const request = buildTranslationRequest(ROWS, { model: "claude-sonnet-5" });
    expect(request.output_config?.effort).toBe("low");
  });

  it("omits effort for an unknown model rather than risking the request", () => {
    const request = buildTranslationRequest(ROWS, { model: "claude-something-7" });
    expect(request.output_config?.effort).toBeUndefined();
  });

  it("reads the model from LLM_MODEL, and falls back to the cheap one", () => {
    expect(buildTranslationRequest(ROWS).model).toBe(DEFAULT_MODEL);
    process.env.LLM_MODEL = "claude-sonnet-5";
    const request = buildTranslationRequest(ROWS);
    expect(request.model).toBe("claude-sonnet-5");
    expect(request.output_config?.effort).toBe("low");
  });

  it("does not let an unknown environment model bypass the cost ceiling", () => {
    process.env.LLM_MODEL = "claude-unpriced-future-model";
    expect(buildTranslationRequest(ROWS).model).toBe(DEFAULT_MODEL);
  });

  it("carries no prefix cache breakpoint — Haiku would ignore one silently", () => {
    expect(JSON.stringify(buildTranslationRequest(ROWS))).not.toContain(
      "cache_control",
    );
  });

  it("never asks for thinking", () => {
    expect(buildTranslationRequest(ROWS).thinking).toBeUndefined();
  });

  it("scales the output ceiling to the list it actually asks about", () => {
    // Three untranslated rows out of four: the translated one is not paid for.
    expect(buildTranslationRequest(ROWS).max_tokens).toBe(outputCeiling(3));
    expect(buildTranslationRequest(ROWS, { maxTokens: 99 }).max_tokens).toBe(99);
  });
});

describe("outputCeiling", () => {
  it("leaves room well past the measured 18 tokens an entry needs", () => {
    expect(outputCeiling(40)).toBeGreaterThan(706 * 2);
  });

  /**
   * A full list of entries at the caller's 64-character limit, each answered
   * with a long gloss, is the most an honest answer can cost. Truncation there
   * would drop rows, so the ceiling has to clear it.
   */
  it("clears the worst honest answer a full list could produce", () => {
    expect(outputCeiling(100)).toBeGreaterThan(100 * 56);
  });

  it("stops at the absolute cap, so a long list cannot raise it", () => {
    expect(outputCeiling(1000)).toBe(outputCeiling(10_000));
    expect(outputCeiling(1000)).toBe(8000);
  });

  it("keeps a short list short — the runaway this bounds is priced per token", () => {
    // Loosened from 500 when the answer went from one field to three. The
    // point of the bound is that a three-word list cannot cost what a
    // hundred-word one does, not the exact figure: it stays an order of
    // magnitude under the 8000 cap.
    expect(outputCeiling(3)).toBeLessThan(1000);
  });
});

describe("TRANSLATION_SCHEMA", () => {
  it("closes every object — structured outputs rejects an open one", () => {
    const item = TRANSLATION_SCHEMA.properties.translations.items;
    expect(TRANSLATION_SCHEMA.additionalProperties).toBe(false);
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual([
      "text",
      "translation",
      "transcription",
      "partOfSpeech",
    ]);
  });

  /**
   * The enrichment fields are required by the schema and optional in the data.
   * Structured outputs has no "optional" — every property must be listed in
   * `required` — so the escape has to be a value, and `""` has to be a member
   * of the part-of-speech enum or the model has no legal way to say "none".
   */
  it("gives the model a legal way to decline a part of speech", () => {
    const item = TRANSLATION_SCHEMA.properties.translations.items;
    expect(item.properties.partOfSpeech.enum).toContain("");
    expect(item.properties.partOfSpeech.enum).toContain("noun");
    for (const value of PARTS_OF_SPEECH) {
      expect(isPartOfSpeech(value)).toBe(true);
    }
    expect(isPartOfSpeech("")).toBe(false);
    expect(isPartOfSpeech("gerund")).toBe(false);
  });

  it("nests items at the depth the stream scanner expects", () => {
    const response = JSON.stringify({
      translations: [{ text: "cat", translation: "кот" }],
    });
    const stream = new JsonArrayStream({ depth: TRANSLATION_ITEM_DEPTH });
    expect(stream.push(response)).toEqual([{ text: "cat", translation: "кот" }]);
  });
});
