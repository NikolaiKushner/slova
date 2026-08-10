import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function getOwnedDeck(deckId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return getPrisma().deck.findFirst({
    where: { id: deckId, userId: session.user.id },
  });
}

export async function getOwnedCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return getPrisma().card.findFirst({
    where: { id: cardId, deck: { userId: session.user.id } },
    include: { deck: true },
  });
}
