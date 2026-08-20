import { describe, expect, it } from "vitest";

import { parseWhoisTarget } from "@/scripts/whois-target";

describe("parseWhoisTarget", () => {
  it("reads a user id straight from a session replay", () => {
    expect(parseWhoisTarget(["--id", "cmsxphye100005cy0htg9b9q3"])).toEqual({
      by: "id",
      id: "cmsxphye100005cy0htg9b9q3",
    });
  });

  it("normalizes an address so the lookup matches the stored one", () => {
    expect(parseWhoisTarget(["--email", "  Person@Example.COM "])).toEqual({
      by: "email",
      email: "person@example.com",
    });
  });

  /**
   * Both flags at once would silently look up one and ignore the other, and an
   * operator reading the output would believe they had checked both.
   */
  it("refuses both flags, neither flag, and a repeated flag", () => {
    expect(() => parseWhoisTarget(["--id", "a", "--email", "b@c.d"])).toThrow();
    expect(() => parseWhoisTarget([])).toThrow();
    expect(() => parseWhoisTarget(["--id", "a", "--id", "b"])).toThrow();
  });

  it("refuses a flag with no value or an unknown flag", () => {
    expect(() => parseWhoisTarget(["--id"])).toThrow(/Missing value/);
    expect(() => parseWhoisTarget(["--email", "--id"])).toThrow(/Missing value/);
    expect(() => parseWhoisTarget(["--user", "a"])).toThrow(/Unexpected/);
  });

  it("refuses something that is not an address", () => {
    expect(() => parseWhoisTarget(["--email", "not-an-address"])).toThrow(
      /Not an email/,
    );
  });
});
