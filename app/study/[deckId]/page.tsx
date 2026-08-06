import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/ownership";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { StudySession } from "@/components/study-session";

type Props = { params: Promise<{ deckId: string }> };

export default async function StudyDeckPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { deckId } = await params;
  const deck = await getOwnedDeck(deckId);
  if (!deck) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16">
      <AppHeader email={session.user.email} />
      <Link
        href={`/decks/${deck.id}`}
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← {deck.title}
      </Link>
      <h1 className="mb-8 font-display text-3xl tracking-tight">{deck.title}</h1>
      <StudySession deckId={deck.id} />
    </main>
  );
}
