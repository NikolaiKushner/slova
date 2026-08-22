import type { Prisma } from "@/app/generated/prisma/client";

/**
 * `UserText.glosses` — one contextual translation per token id, so the second
 * tap on a word costs nothing. docs/plans/shipped/reader.md §5.1.
 */

export type GlossCache = Record<string, string>;

export function glossFor(stored: Prisma.JsonValue, tokenId: string): string | null {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return null;
  const value = (stored as Record<string, unknown>)[tokenId];
  return typeof value === "string" && value ? value : null;
}

export function withGloss(
  stored: Prisma.JsonValue,
  tokenId: string,
  gloss: string,
): GlossCache {
  const existing =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as GlossCache)
      : {};
  return { ...existing, [tokenId]: gloss };
}
