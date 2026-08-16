/**
 * JWTs carry the sessionVersion that was current at sign-in. Password reset
 * increments the column; a token with the old number is dead.
 *
 * Tokens issued before the column existed have no version — treat that as 0,
 * which matches the column default, so a deploy does not sign everyone out.
 */
export function sessionIsCurrent(
  tokenVersion: unknown,
  storedVersion: number | null | undefined,
): boolean {
  if (storedVersion == null) return false;
  const claimed = typeof tokenVersion === "number" ? tokenVersion : 0;
  return claimed === storedVersion;
}
