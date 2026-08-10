import { describe, expect, it } from "vitest";
import { cardUpdateSchema, toCardUpdateData } from "@/lib/cards";

describe("cardUpdateSchema", () => {
  it("trims values before validating", () => {
    const parsed = cardUpdateSchema.parse({ front: "  hello  " });
    expect(parsed.front).toBe("hello");
  });

  it("rejects whitespace-only front", () => {
    expect(cardUpdateSchema.safeParse({ front: "   " }).success).toBe(false);
  });

  it("rejects an empty payload", () => {
    expect(cardUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single field", () => {
    expect(cardUpdateSchema.safeParse({ back: "привет" }).success).toBe(true);
  });

  it("rejects an over-long front", () => {
    const front = "a".repeat(501);
    expect(cardUpdateSchema.safeParse({ front }).success).toBe(false);
  });
});

describe("toCardUpdateData", () => {
  it("omits fields that were not sent", () => {
    expect(toCardUpdateData({ front: "hello" })).toEqual({ front: "hello" });
  });

  it("clears a note sent as an empty string", () => {
    expect(toCardUpdateData({ note: "" })).toEqual({ note: null });
  });

  it("clears a note sent as null", () => {
    expect(toCardUpdateData({ note: null })).toEqual({ note: null });
  });

  it("keeps a real note", () => {
    expect(toCardUpdateData({ note: "formal" })).toEqual({ note: "formal" });
  });
});
