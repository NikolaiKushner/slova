import { describe, expect, it } from "vitest";
import { wordUpdateSchema, toWordUpdateData } from "@/lib/words";

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
