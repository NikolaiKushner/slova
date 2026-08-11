import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function getOwnedSet(setId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return getPrisma().wordSet.findFirst({
    where: { id: setId, userId: session.user.id },
  });
}

export async function getOwnedWord(wordId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return getPrisma().userWord.findFirst({
    where: { id: wordId, userId: session.user.id },
  });
}
