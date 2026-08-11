import { afterEach, describe, expect, it } from "vitest";
import {
  buildTranslationRequest,
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

  it("sends the whole batch in one message", () => {
    const request = buildTranslationRequest(ROWS);
    expect(request.messages).toHaveLength(1);
    expect(request.system).toBe(SYSTEM_PROMPT);
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

  it("carries no prefix cache breakpoint — Haiku would ignore one silently", () => {
    expect(JSON.stringify(buildTranslationRequest(ROWS))).not.toContain(
      "cache_control",
    );
  });

  it("never asks for thinking", () => {
    expect(buildTranslationRequest(ROWS).thinking).toBeUndefined();
  });
});

describe("TRANSLATION_SCHEMA", () => {
  it("closes every object — structured outputs rejects an open one", () => {
    const item = TRANSLATION_SCHEMA.properties.translations.items;
    expect(TRANSLATION_SCHEMA.additionalProperties).toBe(false);
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual(["text", "translation"]);
  });

  it("nests items at the depth the stream scanner expects", () => {
    const response = JSON.stringify({
      translations: [{ text: "cat", translation: "кот" }],
    });
    const stream = new JsonArrayStream({ depth: TRANSLATION_ITEM_DEPTH });
    expect(stream.push(response)).toEqual([{ text: "cat", translation: "кот" }]);
  });
});
