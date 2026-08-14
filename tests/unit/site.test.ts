import { describe, expect, it } from "vitest";

import { CONTACT_EMAIL, MAIL_FROM } from "@/lib/site";

describe("public addresses", () => {
  it("keeps transactional mail and human contact on different inboxes", () => {
    expect(MAIL_FROM).toBe("hello@slova.study");
    expect(CONTACT_EMAIL).toBe("contact@slova.study");
    expect(CONTACT_EMAIL).not.toBe(MAIL_FROM);
  });
});
