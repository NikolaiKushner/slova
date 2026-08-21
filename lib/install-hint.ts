export type InstallContext = {
  userAgent: string;
  standalone: boolean;
  coarsePointer: boolean;
};

const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|Android|Chrome|Chromium/;

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
