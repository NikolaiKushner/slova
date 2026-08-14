import { createHash, randomBytes } from "node:crypto";

import { getPrisma } from "@/lib/prisma";

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
  const prisma = getPrisma();

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + TTL_MS[purpose]),
    },
  });

  return token;
}

export async function consumeToken(
  purpose: TokenPurpose,
  email: string,
  token: string,
): Promise<boolean> {
  const identifier = tokenIdentifier(purpose, email);
  try {
    const row = await getPrisma().verificationToken.delete({
      where: {
        identifier_token: { identifier, token: hashToken(token) },
      },
    });
    return row.expires.getTime() > Date.now();
  } catch {
    return false;
  }
}

export function appOrigin() {
  const raw = process.env.AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
