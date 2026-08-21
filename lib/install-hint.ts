/**
 * Whether to tell this browser that the site can be installed.
 *
 * Worth telling only on iPad Safari, and only there: Safari's tab and
 * favourites bars take 100–150px off a window that a session with the keyboard
 * up is already short of, and «На экран „Домой"» is the two taps that give
 * them back. Everywhere else the line would be noise — a Mac has no Share
 * sheet worth the sentence, and Android has its own install prompt.
 */

export type InstallContext = {
  userAgent: string;
  /** Already installed — there is nothing left to suggest. */
  standalone: boolean;
  /** A finger. An iPad reporting a desktop user agent still has one. */
  coarsePointer: boolean;
};

/** Every WebKit-shaped user agent that is *not* Safari. */
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|Android|Chrome|Chromium/;

/**
 * iPadOS 13 and later report a Mac user agent by default, so the platform
 * cannot be read from the string alone. `Macintosh` plus a coarse pointer is
 * an iPad; a real Mac fails the pointer half.
 */
export function isAppleTouchSafari(userAgent: string) {
  if (NOT_SAFARI.test(userAgent)) return false;
  if (!/Safari/.test(userAgent)) return false;
  return /iPad|iPhone|iPod|Macintosh/.test(userAgent);
}

export function showInstallHint({
  userAgent,
  standalone,
  coarsePointer,
}: InstallContext) {
  if (standalone || !coarsePointer) return false;
  return isAppleTouchSafari(userAgent);
}
