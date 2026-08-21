export type ViewportReading = {
  innerHeight: number;
  height: number;
  offsetTop: number;
};

export type ViewportInset = {
  height: number;
  inset: number;
  offsetTop: number;
  keyboard: boolean;
  size: ViewportSize;
};

export type ViewportSize = "tall" | "short" | "tiny";

export const KEYBOARD_MIN = 120;
export const SHORT_VIEWPORT = 720;
export const TINY_VIEWPORT = 560;

export function viewportSize(height: number): ViewportSize {
  if (height <= TINY_VIEWPORT) return "tiny";
  if (height <= SHORT_VIEWPORT) return "short";
  return "tall";
}

export function readViewport(reading: ViewportReading): ViewportInset {
  const height = Math.round(reading.height);
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
