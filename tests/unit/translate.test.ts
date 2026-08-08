import { describe, expect, it } from "vitest";
import { translateText } from "@/lib/translate";

describe("translateText", () => {
  it("rejects empty text", async () => {
    await expect(translateText("  ", "en", "ru")).rejects.toThrow("Empty text");
  });

  it("returns same text when languages match", async () => {
    await expect(translateText("hello", "en", "en")).resolves.toBe("hello");
  });
});
