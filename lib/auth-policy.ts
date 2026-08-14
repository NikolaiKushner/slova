/**
 * Account-linking rules. Kept free of Prisma and NextAuth so the takeover
 * cases can be tested without standing up a session.
 */

export type RegistrationPlan =
  | "create"
  | "exists"
  | "google-only"
  | "replace-unverified";

export function registrationPlan(
  existing: {
    passwordHash: string | null;
    emailVerified: Date | null;
  } | null,
): RegistrationPlan {
  if (!existing) return "create";
  if (!existing.passwordHash) return "google-only";
  if (existing.emailVerified) return "exists";
  return "replace-unverified";
}

/**
 * Google proved inbox ownership. An unverified password on that row was set
 * by whoever first typed the address — drop it, or they can sign in after
 * Google marks the address verified.
 *
 * `null` means write a null hash. `undefined` means leave the column alone
 * (already-verified people who also have a password must keep it).
 */
export function googleLinkPasswordHash(
  existing: {
    emailVerified: Date | null;
    passwordHash: string | null;
  } | null,
): null | undefined {
  if (existing && !existing.emailVerified && existing.passwordHash) {
    return null;
  }
  return undefined;
}
