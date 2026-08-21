import { describe, expect, it } from "vitest";
import { isAppleTouchSafari, showInstallHint } from "@/lib/install-hint";

const IPAD_MOBILE =
  "Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";
/* iPadOS 13+ asks for the desktop site by default and says «Macintosh». */
const IPAD_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const CHROME_IOS =
  "Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const touch = { standalone: false, coarsePointer: true };

describe("isAppleTouchSafari", () => {
  it("recognises Safari in both of the iPad's user agents", () => {
    expect(isAppleTouchSafari(IPAD_MOBILE)).toBe(true);
    expect(isAppleTouchSafari(IPAD_DESKTOP)).toBe(true);
  });

  it("rejects the browsers that only look like Safari", () => {
    expect(isAppleTouchSafari(CHROME_IOS)).toBe(false);
    expect(isAppleTouchSafari(ANDROID)).toBe(false);
  });
});

describe("showInstallHint", () => {
  it("offers the hint to an iPad that has not installed the site", () => {
    expect(showInstallHint({ userAgent: IPAD_MOBILE, ...touch })).toBe(true);
    expect(showInstallHint({ userAgent: IPAD_DESKTOP, ...touch })).toBe(true);
  });

  it("says nothing once the site is installed", () => {
    expect(
      showInstallHint({
        userAgent: IPAD_MOBILE,
        standalone: true,
        coarsePointer: true,
      }),
    ).toBe(false);
  });

  it("tells a Mac nothing, however much its user agent looks like an iPad", () => {
    // The string is the same one iPadOS sends; only the pointer separates them.
    expect(
      showInstallHint({
        userAgent: IPAD_DESKTOP,
        standalone: false,
        coarsePointer: false,
      }),
    ).toBe(false);
  });

  it("leaves other touch browsers to their own install prompt", () => {
    expect(showInstallHint({ userAgent: ANDROID, ...touch })).toBe(false);
    expect(showInstallHint({ userAgent: CHROME_IOS, ...touch })).toBe(false);
  });
});
