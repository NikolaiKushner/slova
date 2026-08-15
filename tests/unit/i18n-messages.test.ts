import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

function keys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keys(item, `${prefix}${index}.`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      keys(child, `${prefix}${key}.`),
    );
  }
  return [prefix.slice(0, -1)];
}

describe("message catalogs", () => {
  it("keep the same keys in English and Russian", () => {
    expect(keys(ru).sort()).toEqual(keys(en).sort());
  });
});
