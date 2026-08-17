import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AUTH_PATHS,
  PROTECTED_PREFIXES,
  PUBLIC_API_PATHS,
} from "@/lib/auth.config";

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

  it("matches every auth page so a signed-in person is sent home", () => {
    for (const path of AUTH_PATHS) {
      expect(source).toContain(`"${path}"`);
    }
  });

  it("matches /api so a forgotten auth() check is not world-reachable", () => {
    expect(source).toContain('"/api/:path*"');
  });

  it("keeps machine endpoints on the matcher so their own credentials run", () => {
    expect(PUBLIC_API_PATHS).toEqual([
      "/api/cron/cleanup",
      "/api/security/csp-report",
    ]);
  });

  it("does not match a route nobody protects", () => {
    expect(source).not.toContain('"/decks/:path*"');
  });
});
