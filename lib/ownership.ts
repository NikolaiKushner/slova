import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getOwnedDeck(deckId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
  });
}

export async function getOwnedCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.card.findFirst({
    where: { id: cardId, deck: { userId: session.user.id } },
    include: { deck: true },
  });
}
