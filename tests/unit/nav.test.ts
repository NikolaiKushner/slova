import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, activeNavHref, isNavItemActive } from "@/lib/nav";

describe("activeNavHref", () => {
  it("matches an item by its own path", () => {
    expect(activeNavHref("/tasks/today")).toBe("/tasks/today");
    expect(activeNavHref("/practice/grammar")).toBe("/practice/grammar");
  });

  it("gives a nested path to the deeper item, not the section root", () => {
    // Both /dictionary (My words) and /dictionary/sets (My sets) claim this.
    expect(activeNavHref("/dictionary/sets/abc123")).toBe("/dictionary/sets");
    expect(activeNavHref("/dictionary/catalog/phrasal-verbs")).toBe(
      "/dictionary/catalog",
    );
  });

  it("keeps the section root for the section root itself", () => {
    expect(activeNavHref("/dictionary")).toBe("/dictionary");
    expect(activeNavHref("/tasks")).toBe("/tasks");
  });

  it("does not let /tasks/today light up the learning map", () => {
    expect(isNavItemActive("/tasks/today", "/tasks")).toBe(false);
    expect(isNavItemActive("/tasks/today", "/tasks/today")).toBe(true);
  });

  it("routes the study player to Tasks → Today, where it is started from", () => {
    expect(activeNavHref("/study")).toBe("/tasks/today");
    expect(activeNavHref("/study/deck-1")).toBe("/tasks/today");
  });

  it("keeps Courses → Grammar lit inside a lesson", () => {
    expect(activeNavHref("/courses/grammar/present-simple")).toBe(
      "/courses/grammar",
    );
    expect(activeNavHref("/courses/grammar/present-simple/forms")).toBe(
      "/courses/grammar",
    );
  });

  it("routes legacy paths to where their page moved", () => {
    expect(activeNavHref("/home")).toBe("/tasks/today");
    expect(activeNavHref("/import")).toBe("/dictionary");
  });

  it("only matches on a segment boundary", () => {
    // Would be a false positive under a plain startsWith.
    expect(activeNavHref("/dictionaries")).toBeNull();
    expect(activeNavHref("/tasks-archive")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(activeNavHref("/dictionary/sets/")).toBe("/dictionary/sets");
    expect(activeNavHref("/tasks/")).toBe("/tasks");
  });

  it("returns null outside the nav", () => {
    expect(activeNavHref("/login")).toBeNull();
    expect(activeNavHref("/")).toBeNull();
  });
});

describe("NAV_SECTIONS", () => {
  it("has four sections", () => {
    expect(NAV_SECTIONS.map((s) => s.titleKey)).toEqual([
      "tasks",
      "practice",
      "courses",
      "dictionary",
    ]);
  });

  it("has no duplicate hrefs", () => {
    const hrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("resolves every item's own href back to itself", () => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        expect(activeNavHref(item.href)).toBe(item.href);
      }
    }
  });
});
