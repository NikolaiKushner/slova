import { createHash, randomBytes } from "node:crypto";

import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { runSerializable } from "@/lib/serializable-transaction";

export type TokenPurpose = "verify" | "reset";

const TTL_MS: Record<TokenPurpose, number> = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

export function tokenIdentifier(purpose: TokenPurpose, email: string) {
  return `${purpose}:${email}`;
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

export function hashToken(token: string) {
  return createHash("sha256").update(`${token}${secret()}`).digest("hex");
}

export async function issueToken(purpose: TokenPurpose, email: string) {
  const identifier = tokenIdentifier(purpose, email);
  const token = randomBytes(32).toString("base64url");
  const storedToken = hashToken(token);
  const expires = new Date(Date.now() + TTL_MS[purpose]);
  const prisma = getPrisma();

  await prisma.verificationToken.upsert({
    where: { identifier },
    create: {
      identifier,
      token: storedToken,
      expires,
    },
    update: {
      token: storedToken,
      expires,
    },
  });

  return token;
}

export async function consumeTokenWithUserUpdate(
  purpose: TokenPurpose,
  email: string,
  token: string,
  data: Prisma.UserUpdateManyMutationInput,
  now = new Date(),
): Promise<boolean> {
  const identifier = tokenIdentifier(purpose, email);
  const hashed = hashToken(token);
  return runSerializable(getPrisma(), async (transaction) => {
    const consumed = await transaction.verificationToken.deleteMany({
      where: { identifier, token: hashed, expires: { gt: now } },
    });
    if (consumed.count !== 1) return false;

    const updated = await transaction.user.updateMany({
      where: { email },
      data,
    });
    return updated.count === 1;
  });
}

export function appOrigin() {
  const raw = process.env.AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
