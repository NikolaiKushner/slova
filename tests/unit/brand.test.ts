import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BRAND_S_PATH } from "@/lib/brand";

describe("brand mark", () => {
  it("keeps the favicon S in step with the in-app path", () => {
    const svg = readFileSync(resolve("app/icon.svg"), "utf8");
    expect(svg).toContain(BRAND_S_PATH);
  });

  it("is well-formed XML so the tab will load it", () => {
    // `--` inside an XML comment is illegal. Chrome then skips the SVG and
    // asks for /favicon.ico, which is how the tab became a globe.
    const svg = readFileSync(resolve("app/icon.svg"), "utf8");
    expect(svg).not.toMatch(/<!--[\s\S]*?-->/);
  });
});
