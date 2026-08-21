/**
 * What the on-screen keyboard has taken, and what is left to draw in.
 *
 * iOS does not resize the layout viewport when the keyboard opens: it shrinks
 * only the *visual* viewport. `100dvh` therefore keeps its full height, our
 * scroller keeps its full height, and Safari — scrolling the focused field
 * into the strip that is actually visible — pushes the question off the top.
 * `visualViewport` is the only thing on the platform that knows the strip's
 * real height, so this is the arithmetic that turns it into layout.
 *
 * Pure on purpose: the DOM reading lives in `use-viewport-inset`, the decision
 * lives here, and the decision is the part worth a test.
 */

/** The three numbers a browser can tell us about the visible strip. */
export type ViewportReading = {
  /** Layout viewport height — what `100dvh` resolves to. */
  innerHeight: number;
  /** Visual viewport height — what the learner can actually see. */
  height: number;
  /** How far the visual viewport has slid down the layout viewport. */
  offsetTop: number;
};

export type ViewportInset = {
  /** Height of the visible strip, in CSS pixels. */
  height: number;
  /** How much is hidden below it — the keyboard, when there is one. */
  inset: number;
  /** Kept for diagnosis only; nothing is positioned from it yet. */
  offsetTop: number;
  /** A keyboard, as opposed to a toolbar or a rounding error. */
  keyboard: boolean;
  /** Which set of §15.2 zone heights the strip can hold. */
  size: ViewportSize;
};

export type ViewportSize = "tall" | "short" | "tiny";

/**
 * An iPad with a hardware keyboard attached still shows a ~55px accessory bar,
 * and Safari's own toolbars come and go by a few pixels on scroll. Below this
 * nothing has happened that is worth reflowing a session for.
 */
export const KEYBOARD_MIN = 120;

/** A drill's zones total ~700px; below this they have to give ground. */
export const SHORT_VIEWPORT = 720;
/** iPad landscape with the keyboard up lands here. Every zone at minimum. */
export const TINY_VIEWPORT = 560;

export function viewportSize(height: number): ViewportSize {
  if (height <= TINY_VIEWPORT) return "tiny";
  if (height <= SHORT_VIEWPORT) return "short";
  return "tall";
}

export function readViewport(reading: ViewportReading): ViewportInset {
  const height = Math.round(reading.height);

  /*
   * What is hidden at the bottom of the layout viewport. Clamped at zero
   * because iOS 26 is known to leave `offsetTop` non-zero after the keyboard
   * is dismissed, which drives this negative — a stuck offset must read as
   * "no keyboard", never as a keyboard of negative height.
   */
  const inset = Math.max(
    0,
    Math.round(reading.innerHeight - reading.height - reading.offsetTop),
  );

  return {
    height,
    inset,
    offsetTop: Math.round(reading.offsetTop),
    keyboard: inset >= KEYBOARD_MIN,
    size: viewportSize(height),
  };
}

export function sameViewport(a: ViewportInset, b: ViewportInset) {
  return (
    a.height === b.height &&
    a.inset === b.inset &&
    a.offsetTop === b.offsetTop &&
    a.keyboard === b.keyboard &&
    a.size === b.size
  );
}
