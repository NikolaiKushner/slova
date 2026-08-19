import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { NAV_SECTIONS } from "@/lib/nav";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

/**
 * The public mockup used to keep its own list of sections and advertised a
 * Today screen for months after the route was removed. Shared design tokens
 * did not catch it, because the drift was in the content. These tests hold the
 * marketing shell to one source of navigation truth.
 */

const frame = readFileSync(resolve("components/product-frame.tsx"), "utf8");
const landing = readFileSync(resolve("app/(public)/page.tsx"), "utf8");

describe("decorative product shell", () => {
  it("renders NAV_SECTIONS instead of its own section list", () => {
    expect(frame).toContain('from "@/lib/nav"');
    expect(frame).toContain("NAV_SECTIONS.map");
  });

  it("highlights by live href, not by a historical screen name", () => {
    expect(frame).toContain("activeHref");
    expect(frame).not.toMatch(/active\s*===\s*"(today|courses)"/);
  });

  it("has no label for a section that left the app", () => {
    for (const stale of ["tasks", "today", "courses", "practice"]) {
      expect(frame).not.toContain(`t("${stale}")`);
    }
  });

  it("does not depict the removed Today screen on the landing", () => {
    expect(landing).not.toContain("TodayScreen");
    expect(landing).toContain("TrainingsOverviewStill");
  });
});

describe("navigation labels", () => {
  const labelKeys = [
    ...NAV_SECTIONS.map((section) => section.titleKey),
    ...NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.titleKey),
    ),
  ];

  it.each([
    ["ru", ru.nav as Record<string, string>],
    ["en", en.nav as Record<string, string>],
  ])("names every nav item in %s", (_locale, nav) => {
    for (const key of labelKeys) {
      expect(nav[key]).toBeTruthy();
    }
  });
});
