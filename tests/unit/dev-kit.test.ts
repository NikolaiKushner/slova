import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("development kit route", () => {
  it("returns not found outside development", () => {
    const source = readFileSync("app/dev/kit/layout.tsx", "utf8");
    expect(source).toContain('process.env.NODE_ENV !== "development"');
    expect(source).toContain("notFound()");
  });
});
