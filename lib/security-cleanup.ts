import type { PrismaClient } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type SecurityCleanupResult = {
  rateLimits: number;
  verificationTokens: number;
};

export async function cleanupExpiredSecurityState(
  now = new Date(),
  prisma: PrismaClient = getPrisma(),
): Promise<SecurityCleanupResult> {
  const [rateLimits, verificationTokens] = await prisma.$transaction([
    prisma.rateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lte: now } } }),
  ]);
  return {
    rateLimits: rateLimits.count,
    verificationTokens: verificationTokens.count,
  };
}
