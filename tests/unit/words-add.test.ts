import { describe, expect, it } from "vitest";
import { dedupe } from "@/lib/words/add";

describe("dedupe", () => {
  it("keys by the same rule the database is unique on", () => {
    const { byKey, skipped } = dedupe([
      { front: "Cat", back: "кот" },
      { front: "  cat  ", back: "кошка" },
    ]);
    expect([...byKey.keys()]).toEqual(["cat"]);
    // The first spelling wins; the second is reported rather than swallowed.
    expect(byKey.get("cat")).toEqual({ front: "Cat", back: "кот" });
    expect(skipped).toBe(1);
  });

  it("drops a row with no translation instead of storing a blank", () => {
    const { byKey, skipped } = dedupe([
      { front: "cat", back: "   " },
      { front: "dog", back: "собака" },
    ]);
    expect([...byKey.keys()]).toEqual(["dog"]);
    expect(skipped).toBe(1);
  });

  it("drops a row whose word normalises to nothing", () => {
    const { byKey, skipped } = dedupe([
      { front: "  —  ", back: "тире" },
      { front: "dog", back: "собака" },
    ]);
    expect([...byKey.keys()]).toEqual(["dog"]);
    expect(skipped).toBe(1);
  });

  it("trims what it keeps", () => {
    const { byKey } = dedupe([{ front: " cat ", back: " кот " }]);
    expect(byKey.get("cat")).toEqual({ front: "cat", back: "кот" });
  });
});
