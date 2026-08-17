import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, activeNavHref, isNavItemActive } from "@/lib/nav";

describe("activeNavHref", () => {
  it("matches an item by its own path", () => {
    expect(activeNavHref("/practice")).toBe("/practice");
    expect(activeNavHref("/courses/grammar")).toBe("/courses/grammar");
  });

  it("gives a nested path to the deeper item, not the section root", () => {
    // Both /dictionary (My words) and /dictionary/sets (My sets) claim this.
    expect(activeNavHref("/dictionary/sets/abc123")).toBe("/dictionary/sets");
  });

  it("keeps the section root for the section root itself", () => {
    expect(activeNavHref("/dictionary")).toBe("/dictionary");
    expect(activeNavHref("/practice")).toBe("/practice");
  });

  it("routes the study player to Trainings, where it is started from", () => {
    expect(activeNavHref("/study")).toBe("/practice");
    expect(activeNavHref("/study/deck-1")).toBe("/practice");
  });

  it("keeps Grammar lit inside a lesson", () => {
    expect(activeNavHref("/courses/grammar/present-simple")).toBe(
      "/courses/grammar",
    );
    expect(activeNavHref("/courses/grammar/present-simple/forms")).toBe(
      "/courses/grammar",
    );
  });

  it("routes legacy import to My words", () => {
    expect(activeNavHref("/import")).toBe("/dictionary");
  });

  it("does not claim paths that left the menu", () => {
    expect(activeNavHref("/tasks/today")).toBeNull();
    expect(activeNavHref("/tasks")).toBeNull();
    expect(activeNavHref("/home")).toBeNull();
    expect(activeNavHref("/courses/my")).toBeNull();
  });

  it("only matches on a segment boundary", () => {
    // Would be a false positive under a plain startsWith.
    expect(activeNavHref("/dictionaries")).toBeNull();
    expect(activeNavHref("/practice-archive")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(activeNavHref("/dictionary/sets/")).toBe("/dictionary/sets");
    expect(activeNavHref("/practice/")).toBe("/practice");
  });

  it("returns null outside the nav", () => {
    expect(activeNavHref("/login")).toBeNull();
    expect(activeNavHref("/")).toBeNull();
  });
});

describe("NAV_SECTIONS", () => {
  it("is Study then Dictionary", () => {
    expect(NAV_SECTIONS.map((s) => s.titleKey)).toEqual(["study", "dictionary"]);
    expect(NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href))).toEqual([
      "/practice",
      "/courses/grammar",
      "/dictionary",
      "/dictionary/sets",
    ]);
  });

  it("has grammar once, pointing at the catalog", () => {
    const grammar = NAV_SECTIONS.flatMap((s) => s.items).filter(
      (item) => item.titleKey === "grammar",
    );
    expect(grammar).toEqual([{ titleKey: "grammar", href: "/courses/grammar" }]);
  });

  it("has no duplicate hrefs", () => {
    const hrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("resolves every item's own href back to itself", () => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        expect(activeNavHref(item.href)).toBe(item.href);
        expect(isNavItemActive(item.href, item.href)).toBe(true);
      }
    }
  });
});
