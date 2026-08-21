import { describe, expect, it } from "vitest";
import {
  KEYBOARD_MIN,
  readViewport,
  sameViewport,
  viewportSize,
} from "@/lib/viewport-inset";

/* iPad 11″ landscape with Safari's tab and favourites bars. */
const IPAD_LANDSCAPE = { innerHeight: 690, height: 690, offsetTop: 0 };
/* The same window with the software keyboard up. */
const WITH_KEYBOARD = { innerHeight: 690, height: 310, offsetTop: 0 };

describe("readViewport", () => {
  it("reports no inset when nothing covers the window", () => {
    const reading = readViewport(IPAD_LANDSCAPE);
    expect(reading.inset).toBe(0);
    expect(reading.keyboard).toBe(false);
    expect(reading.height).toBe(690);
  });

  it("measures what the keyboard covers", () => {
    const reading = readViewport(WITH_KEYBOARD);
    expect(reading.inset).toBe(380);
    expect(reading.keyboard).toBe(true);
    expect(reading.height).toBe(310);
  });

  it("counts the offset of the visual viewport as covered", () => {
    // Safari slid the visual viewport down to reach the field: the part of the
    // layout viewport below it is hidden just as surely as the part behind the
    // keyboard, and both have to come off the frame's height.
    const reading = readViewport({
      innerHeight: 690,
      height: 310,
      offsetTop: 120,
    });
    expect(reading.inset).toBe(260);
    expect(reading.offsetTop).toBe(120);
  });

  it("reads a stuck offsetTop as no keyboard rather than a negative one", () => {
    // iOS 26 leaves `offsetTop` where the keyboard left it after dismissal.
    // Naively that is a keyboard of negative height, which would stretch the
    // frame past the window; it has to clamp to nothing at all.
    const reading = readViewport({
      innerHeight: 690,
      height: 690,
      offsetTop: 380,
    });
    expect(reading.inset).toBe(0);
    expect(reading.keyboard).toBe(false);
  });

  it("ignores a hardware keyboard's accessory bar", () => {
    const reading = readViewport({
      innerHeight: 690,
      height: 690 - (KEYBOARD_MIN - 1),
      offsetTop: 0,
    });
    expect(reading.inset).toBe(KEYBOARD_MIN - 1);
    expect(reading.keyboard).toBe(false);
  });

  it("rounds the fractional heights Safari reports", () => {
    const reading = readViewport({
      innerHeight: 833.5,
      height: 452.5,
      offsetTop: 0,
    });
    expect(reading.height).toBe(453);
    expect(reading.inset).toBe(381);
  });
});

describe("viewportSize", () => {
  it("keeps the drill's own numbers where they fit", () => {
    expect(viewportSize(900)).toBe("tall");
    expect(viewportSize(721)).toBe("tall");
  });

  it("steps down on a short strip", () => {
    expect(viewportSize(720)).toBe("short");
    expect(viewportSize(561)).toBe("short");
  });

  it("goes to the minimum when the keyboard is up in landscape", () => {
    expect(viewportSize(560)).toBe("tiny");
    expect(readViewport(WITH_KEYBOARD).size).toBe("tiny");
  });
});

describe("sameViewport", () => {
  it("holds a reading still while the numbers do not move", () => {
    expect(
      sameViewport(readViewport(IPAD_LANDSCAPE), readViewport(IPAD_LANDSCAPE)),
    ).toBe(true);
  });

  it("notices the keyboard", () => {
    expect(
      sameViewport(readViewport(IPAD_LANDSCAPE), readViewport(WITH_KEYBOARD)),
    ).toBe(false);
  });

  it("notices a scroll that changed nothing but the offset", () => {
    expect(
      sameViewport(
        readViewport({ innerHeight: 690, height: 310, offsetTop: 0 }),
        readViewport({ innerHeight: 690, height: 310, offsetTop: 40 }),
      ),
    ).toBe(false);
  });
});
