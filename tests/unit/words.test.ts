import { describe, expect, it } from "vitest";
import {
  filingSchema,
  toWordUpdateData,
  wordUpdateSchema,
} from "@/lib/words";

describe("wordUpdateSchema", () => {
  it("trims values before validating", () => {
    const parsed = wordUpdateSchema.parse({ front: "  hello  " });
    expect(parsed.front).toBe("hello");
  });

  it("rejects whitespace-only front", () => {
    expect(wordUpdateSchema.safeParse({ front: "   " }).success).toBe(false);
  });

  it("rejects an empty payload", () => {
    expect(wordUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single field", () => {
    expect(wordUpdateSchema.safeParse({ back: "привет" }).success).toBe(true);
  });

  it("rejects an over-long front", () => {
    const front = "a".repeat(501);
    expect(wordUpdateSchema.safeParse({ front }).success).toBe(false);
  });
});

describe("toWordUpdateData", () => {
  it("omits fields that were not sent", () => {
    expect(toWordUpdateData({ front: "hello" })).toEqual({ front: "hello" });
  });

  it("clears a note sent as an empty string", () => {
    expect(toWordUpdateData({ note: "" })).toEqual({ note: null });
  });

  it("clears a note sent as null", () => {
    expect(toWordUpdateData({ note: null })).toEqual({ note: null });
  });

  it("keeps a real note", () => {
    expect(toWordUpdateData({ note: "formal" })).toEqual({ note: "formal" });
  });
});

describe("filingSchema", () => {
  const ids = ["word-1"];

  it("accepts an existing set and defaults to move", () => {
    const parsed = filingSchema.parse({ ids, setId: "set-1" });
    expect(parsed.mode).toBe("move");
    expect(parsed.setId).toBe("set-1");
  });

  it("accepts a new set name and trims it", () => {
    const parsed = filingSchema.parse({
      ids,
      setTitle: "  Irregular verbs  ",
      mode: "add",
    });
    expect(parsed.setTitle).toBe("Irregular verbs");
    expect(parsed.mode).toBe("add");
  });

  it("rejects both a set id and a new name", () => {
    expect(
      filingSchema.safeParse({ ids, setId: "set-1", setTitle: "Verbs" }).success,
    ).toBe(false);
  });

  it("rejects filing with nowhere to go", () => {
    expect(filingSchema.safeParse({ ids }).success).toBe(false);
  });

  it("rejects taking words out of a set that does not exist yet", () => {
    expect(
      filingSchema.safeParse({ ids, setTitle: "Verbs", mode: "remove" }).success,
    ).toBe(false);
  });

  it("accepts taking words out of an existing set", () => {
    expect(
      filingSchema.safeParse({ ids, setId: "set-1", mode: "remove" }).success,
    ).toBe(true);
  });

  it("rejects a whitespace-only new name", () => {
    expect(filingSchema.safeParse({ ids, setTitle: "   " }).success).toBe(false);
  });
});
