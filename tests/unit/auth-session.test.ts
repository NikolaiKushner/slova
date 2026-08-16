import { describe, expect, it } from "vitest";

import { sessionIsCurrent } from "@/lib/auth-session";

describe("sessionIsCurrent", () => {
  it("accepts a token that still matches the row", () => {
    expect(sessionIsCurrent(3, 3)).toBe(true);
  });

  it("rejects a token from before a password reset", () => {
    expect(sessionIsCurrent(0, 1)).toBe(false);
    expect(sessionIsCurrent(2, 3)).toBe(false);
  });

  it("treats a missing version as 0, so existing sessions survive the deploy", () => {
    expect(sessionIsCurrent(undefined, 0)).toBe(true);
    expect(sessionIsCurrent(undefined, 1)).toBe(false);
  });

  it("rejects a token whose user row is gone", () => {
    expect(sessionIsCurrent(0, null)).toBe(false);
    expect(sessionIsCurrent(0, undefined)).toBe(false);
  });
});
