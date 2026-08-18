import { readFileSync } from "node:fs";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import {
  AUTH_PATHS,
  PROTECTED_PREFIXES,
  PUBLIC_API_PATHS,
} from "@/lib/auth.config";

const nextProxyConfig = {
  matcher: [
    ...PROTECTED_PREFIXES.map((prefix) => `${prefix}/:path*`),
    ...AUTH_PATHS,
    "/api/:path*",
  ],
};

/**
 * Next reads `config.matcher` in proxy.ts statically, so it has to be a
 * literal and cannot share the array in lib/auth.config.ts. Reading the file
 * back is the cheap way to keep the copy honest.
 */
const source = readFileSync("proxy.ts", "utf8");

describe("proxy matcher", () => {
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

  it.each([
    "/practice",
    "/dictionary/sets/example",
    "/login",
    "/api/study/review",
  ])("matches protected and auth URL %s through Next.js", (url) => {
    expect(
      unstable_doesMiddlewareMatch({
        config: nextProxyConfig,
        nextConfig: {},
        url,
      }),
    ).toBe(true);
  });

  it.each(["/", "/privacy", "/_next/static/app.js", "/icon.svg"])(
    "skips public URL %s through Next.js",
    (url) => {
      expect(
        unstable_doesMiddlewareMatch({
          config: nextProxyConfig,
          nextConfig: {},
          url,
        }),
      ).toBe(false);
    },
  );
});
