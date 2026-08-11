import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROTECTED_PREFIXES } from "@/lib/auth.config";

/**
 * Next reads `config.matcher` in middleware.ts statically, so it has to be a
 * literal and cannot share the array in lib/auth.config.ts. Reading the file
 * back is the cheap way to keep the copy honest.
 */
const source = readFileSync("middleware.ts", "utf8");

describe("middleware matcher", () => {
  it("covers every protected prefix", () => {
    for (const prefix of PROTECTED_PREFIXES) {
      expect(source).toContain(`"${prefix}/:path*"`);
    }
  });

  it("still matches the sign-in page, which redirects when already signed in", () => {
    expect(source).toContain('"/login"');
  });

  it("does not match a route nobody protects", () => {
    expect(source).not.toContain('"/decks/:path*"');
  });
});
