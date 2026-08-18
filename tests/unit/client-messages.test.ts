import { describe, expect, it } from "vitest";

import { pickClientMessages } from "@/lib/i18n/client-messages";

describe("pickClientMessages", () => {
  it("serializes only requested namespaces", () => {
    const messages = {
      common: { save: "Save" },
      dictionary: { title: "Words" },
      privateServerOnly: { secret: "not for the client" },
    };

    expect(pickClientMessages(messages, ["common", "dictionary"])).toEqual({
      common: messages.common,
      dictionary: messages.dictionary,
    });
  });

  it("ignores a missing optional namespace", () => {
    expect(pickClientMessages({ common: {} }, ["common", "missing"])).toEqual({
      common: {},
    });
  });
});
