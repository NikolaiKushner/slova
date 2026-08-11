import { describe, expect, it } from "vitest";
import { JsonArrayStream } from "@/lib/llm/json-array-stream";

/** Feed a document one character at a time — the worst case a network gives us. */
function scanCharByChar<T>(json: string, depth = 2): T[] {
  const stream = new JsonArrayStream<T>({ depth });
  const out: T[] = [];
  for (const char of json) out.push(...stream.push(char));
  return out;
}

type Item = { text: string; translation: string };

describe("JsonArrayStream", () => {
  it("emits each object as its closing brace arrives, not at the end", () => {
    const stream = new JsonArrayStream<Item>();
    expect(stream.push('{"translations":[{"text":"a","transl')).toEqual([]);
    expect(stream.push('ation":"а"},')).toEqual([
      { text: "a", translation: "а" },
    ]);
    expect(stream.push('{"text":"b","translation":"б"}]}')).toEqual([
      { text: "b", translation: "б" },
    ]);
  });

  it("survives being cut between every character", () => {
    const json = '{"translations":[{"text":"a","translation":"а"},{"text":"b","translation":"б"}]}';
    expect(scanCharByChar<Item>(json)).toEqual([
      { text: "a", translation: "а" },
      { text: "b", translation: "б" },
    ]);
  });

  it("ignores braces and brackets inside string values", () => {
    const json = '{"translations":[{"text":"a","translation":"фигурная } скобка [и] ещё {"}]}';
    expect(scanCharByChar<Item>(json)).toEqual([
      { text: "a", translation: "фигурная } скобка [и] ещё {" },
    ]);
  });

  it("does not end a string on an escaped quote", () => {
    const json = '{"translations":[{"text":"say \\"hi\\"","translation":"скажи \\"привет\\""}]}';
    expect(scanCharByChar<Item>(json)).toEqual([
      { text: 'say "hi"', translation: 'скажи "привет"' },
    ]);
  });

  it("treats a trailing backslash as escaped, not as an escape of the quote", () => {
    // The value ends in a literal backslash: "a\\" — the quote after it closes
    // the string, and the object must still be found.
    const json = '{"translations":[{"text":"a","translation":"обратный слеш \\\\"}]}';
    expect(scanCharByChar<Item>(json)).toEqual([
      { text: "a", translation: "обратный слеш \\" },
    ]);
  });

  it("keeps whatever completed when the stream is cut off", () => {
    const stream = new JsonArrayStream<Item>();
    const done = stream.push(
      '{"translations":[{"text":"a","translation":"а"},{"text":"b","transl',
    );
    expect(done).toEqual([{ text: "a", translation: "а" }]);
    // The half-arrived object is held, not guessed at.
    expect(stream.pending).toBe(true);
  });

  it("reports nothing pending on a clean cut between objects", () => {
    const stream = new JsonArrayStream<Item>();
    stream.push('{"translations":[{"text":"a","translation":"а"},');
    expect(stream.pending).toBe(false);
  });

  it("does not confuse a nested object with an item", () => {
    const json =
      '{"translations":[{"text":"a","translation":"а","meta":{"source":"llm"}}]}';
    expect(scanCharByChar(json)).toEqual([
      { text: "a", translation: "а", meta: { source: "llm" } },
    ]);
  });

  it("reads a bare top-level array at depth 1", () => {
    const json = '[{"text":"a","translation":"а"},{"text":"b","translation":"б"}]';
    expect(scanCharByChar<Item>(json, 1)).toEqual([
      { text: "a", translation: "а" },
      { text: "b", translation: "б" },
    ]);
  });
});
