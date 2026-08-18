import { describe, expect, it } from "vitest";

import {
  MAX_SET_FILTERS,
  parseOptionalSetId,
  parseRepeatedSetIds,
} from "@/lib/request-query";

describe("set query bounds", () => {
  it("deduplicates valid repeated set filters", () => {
    const params = new URLSearchParams("set=one&set=two&set=one");
    expect(parseRepeatedSetIds(params)).toEqual({
      ok: true,
      ids: ["one", "two"],
    });
  });

  it("refuses too many set filters", () => {
    const params = new URLSearchParams();
    for (let index = 0; index <= MAX_SET_FILTERS; index += 1) {
      params.append("set", `set-${index}`);
    }
    expect(parseRepeatedSetIds(params)).toEqual({ ok: false });
  });

  it("refuses empty and unbounded opaque identifiers", () => {
    expect(parseRepeatedSetIds(new URLSearchParams("set=%20"))).toEqual({
      ok: false,
    });
    expect(parseOptionalSetId("x".repeat(129))).toEqual({ ok: false });
  });
});
