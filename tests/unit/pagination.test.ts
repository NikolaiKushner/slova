import { describe, expect, it } from "vitest";

import { paginationItems } from "@/lib/pagination";

describe("paginationItems", () => {
  it("lists every page when there are few enough", () => {
    expect(paginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps a neighbour, then an ellipsis, then the last page", () => {
    expect(paginationItems(2, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
  });

  it("ellipses both sides when the current page is in the middle", () => {
    expect(paginationItems(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  it("does not ellipsis a single skipped page at the end", () => {
    expect(paginationItems(9, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });

  it("is empty when there are no pages", () => {
    expect(paginationItems(1, 0)).toEqual([]);
  });
});
