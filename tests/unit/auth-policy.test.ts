import { describe, expect, it } from "vitest";

import {
  googleLinkPasswordHash,
  registrationPlan,
} from "@/lib/auth-policy";
import { isEmail } from "@/lib/password-rules";
import { createFixedWindowRateLimiter } from "@/lib/rate-limit";
import { clientIpFromHeaders } from "@/lib/client-ip";

describe("registrationPlan", () => {
  it("creates a new row when the address is free", () => {
    expect(registrationPlan(null)).toBe("create");
  });

  it("refuses a verified password account", () => {
    expect(
      registrationPlan({
        passwordHash: "salt:hash",
        emailVerified: new Date(),
      }),
    ).toBe("exists");
  });

  it("points Google-only people at Google or reset, not a second password", () => {
    expect(
      registrationPlan({ passwordHash: null, emailVerified: new Date() }),
    ).toBe("google-only");
  });

  it("replaces the hash on an unverified squat so the inbox owner can take the row", () => {
    expect(
      registrationPlan({ passwordHash: "attacker:hash", emailVerified: null }),
    ).toBe("replace-unverified");
  });
});

describe("googleLinkPasswordHash", () => {
  it("strips an unverified password so Google verification cannot unlock a squat", () => {
    expect(
      googleLinkPasswordHash({
        emailVerified: null,
        passwordHash: "attacker:hash",
      }),
    ).toBeNull();
  });

  it("leaves a verified password in place when the same person later uses Google", () => {
    expect(
      googleLinkPasswordHash({
        emailVerified: new Date(),
        passwordHash: "own:hash",
      }),
    ).toBeUndefined();
  });

  it("does not invent a hash for Google-only rows", () => {
    expect(
      googleLinkPasswordHash({
        emailVerified: null,
        passwordHash: null,
      }),
    ).toBeUndefined();
  });
});

describe("rate limiter", () => {
  it("allows up to the limit inside the window, then refuses", () => {
    const allow = createFixedWindowRateLimiter();
    expect(allow("k", 2, 1000, 0)).toBe(true);
    expect(allow("k", 2, 1000, 1)).toBe(true);
    expect(allow("k", 2, 1000, 2)).toBe(false);
  });

  it("forgets hits once the window has passed", () => {
    const allow = createFixedWindowRateLimiter();
    expect(allow("k", 1, 1000, 0)).toBe(true);
    expect(allow("k", 1, 1000, 1000)).toBe(true);
  });
});

describe("client IP", () => {
  it("uses the first valid forwarding address", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("collapses malformed values into one bounded limiter key", () => {
    const headers = new Headers({ "x-forwarded-for": "not-an-ip" });
    expect(clientIpFromHeaders(headers)).toBe("unknown");
  });
});

describe("email", () => {
  it("rejects addresses longer than the RFC maximum", () => {
    expect(isEmail(`${"a".repeat(251)}@x.y`)).toBe(false);
  });
});
