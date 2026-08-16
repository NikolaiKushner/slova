import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

/**
 * The type scale and text colours have to survive each other.
 *
 * This is here because the failure mode has no symptom: tailwind-merge simply
 * removes the class, nothing warns, and the element renders in whatever colour
 * it inherited. It cost us a primary button with near-black text on dark green
 * and a whole interface quietly flattened to one shade of grey.
 */

describe("cn keeps a type-scale size and a text colour together", () => {
  it("does not let a scale size delete the colour before it", () => {
    // The exact shape the Button was built from: colour in the variant,
    // size in the size variant, size therefore last.
    expect(cn("bg-primary text-primary-foreground", "text-body-sm")).toContain(
      "text-primary-foreground",
    );
  });

  it("does not let a colour delete the size before it", () => {
    expect(cn("text-caption", "text-muted-foreground")).toContain("text-caption");
  });

  it("covers every name in the scale", () => {
    const scale = [
      "display",
      "h1",
      "h2",
      "h3",
      "h4",
      "lead",
      "body",
      "body-sm",
      "caption",
      "overline",
      "token",
      "numeral",
    ];
    for (const name of scale) {
      const out = cn("text-muted-foreground", `text-${name}`);
      expect(out, name).toContain("text-muted-foreground");
      expect(out, name).toContain(`text-${name}`);
    }
  });

  it("still collapses two real sizes, and two real colours", () => {
    // The merging we do want is unaffected.
    expect(cn("text-caption", "text-h1")).toBe("text-h1");
    expect(cn("text-foreground", "text-muted-foreground")).toBe(
      "text-muted-foreground",
    );
  });
});
