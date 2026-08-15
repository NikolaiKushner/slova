import { describe, expect, it } from "vitest";

import {
  DEFAULT_EMAIL_FROM,
  brandedEmailHtml,
  confirmEmailCopy,
  resetEmailCopy,
} from "@/lib/auth-email";
import { tokenIdentifier } from "@/lib/auth-tokens";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  isEmail,
  normalizeEmail,
  passwordIssue,
} from "@/lib/password-rules";

const URL =
  "https://slova.study/verify-email?email=you%40slova.study&token=abc";

describe("password hashing", () => {
  it("round-trips a password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("rejects short passwords before they are stored", () => {
    expect(passwordIssue("short")).toBe("passwordTooShort");
    expect(passwordIssue("long-enough")).toBeNull();
  });
});

describe("email", () => {
  it("normalises case and wrapping space", () => {
    expect(normalizeEmail("  You@Slova.STUDY ")).toBe("you@slova.study");
    expect(isEmail("you@slova.study")).toBe(true);
    expect(isEmail("not-an-email")).toBe(false);
  });
});

describe("auth tokens", () => {
  it("namespaces confirm and reset so they cannot be swapped", () => {
    expect(tokenIdentifier("verify", "you@slova.study")).toBe(
      "verify:you@slova.study",
    );
    expect(tokenIdentifier("reset", "you@slova.study")).toBe(
      "reset:you@slova.study",
    );
  });
});

describe("auth emails", () => {
  it("puts the callback in both bodies so a text-only client can still open it", () => {
    const confirm = confirmEmailCopy(URL);
    expect(confirm.html).toContain(URL.replace(/&/g, "&amp;"));
    expect(confirm.text).toContain(URL);
    expect(resetEmailCopy(URL).subject).toMatch(/reset/i);
  });

  it("puts the token only on the button, not in visible copy", () => {
    const html = brandedEmailHtml({
      body: "Confirm this email.",
      button: "Confirm email",
      url: URL,
      ignore: "If you did not ask for this, you can ignore the email.",
    });
    expect(html).toContain(`href="${URL.replace(/&/g, "&amp;")}"`);
    const visible = html.replace(/<[^>]+>/g, " ");
    expect(visible).not.toContain("token=abc");
    expect(visible).toContain("Confirm email");
  });

  it("sends from the branded address by default", () => {
    expect(DEFAULT_EMAIL_FROM).toBe("Slova <hello@slova.study>");
  });
});
