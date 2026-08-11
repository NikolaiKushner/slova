import { describe, expect, it } from "vitest";
import { normalizeKey, sameKey } from "@/lib/lexicon/key";

describe("normalizeKey", () => {
  it("folds case", () => {
    expect(normalizeKey("Monitor")).toBe("monitor");
    expect(normalizeKey("MRI")).toBe("mri");
  });

  it("collapses every kind of whitespace", () => {
    expect(normalizeKey("  medical   records ")).toBe("medical records");
    // Non-breaking space, which pasting from Word supplies generously.
    expect(normalizeKey("medical records")).toBe("medical records");
  });

  it("drops list markers a paste dragged in", () => {
    expect(normalizeKey("1. monitor")).toBe("monitor");
    expect(normalizeKey("2)monitor")).toBe("monitor");
    expect(normalizeKey("- monitor")).toBe("monitor");
    expect(normalizeKey("• monitor")).toBe("monitor");
  });

  it("keeps a decimal that only looks like a marker", () => {
    expect(normalizeKey("1.5 times")).toBe("1.5 times");
  });

  it("drops wrapping quotes and edge punctuation", () => {
    expect(normalizeKey('"monitor"')).toBe("monitor");
    expect(normalizeKey("«монитор»")).toBe("монитор");
    expect(normalizeKey("monitor.")).toBe("monitor");
    expect(normalizeKey("monitor?")).toBe("monitor");
  });

  it("treats ё and е as the same spelling", () => {
    expect(normalizeKey("ёлка")).toBe(normalizeKey("елка"));
    expect(sameKey("Тёмный", "темный")).toBe(true);
  });

  it("keeps hyphens, apostrophes and slashes — they change the word", () => {
    expect(normalizeKey("e-mail")).not.toBe(normalizeKey("email"));
    expect(normalizeKey("don't")).not.toBe(normalizeKey("dont"));
    expect(normalizeKey("was/were")).toBe("was/were");
  });

  it("is idempotent", () => {
    const once = normalizeKey('  1. "Medical  Records." ');
    expect(normalizeKey(once)).toBe(once);
    expect(once).toBe("medical records");
  });

  it("survives text that is only punctuation", () => {
    expect(normalizeKey("...")).toBe("");
    expect(normalizeKey("   ")).toBe("");
  });
});
