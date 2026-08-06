import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DeleteDeckButton } from "@/components/delete-deck-button";
import { ImportForm } from "@/components/import-form";

type Props = { params: Promise<{ id: string }> };

export default async function DeckPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const deck = await prisma.deck.findFirst({
    where: { id, userId: session.user.id },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });
  if (!deck) notFound();

  const now = new Date();
  const dueCount = deck.cards.filter((c) => c.dueAt <= now).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16">
      <AppHeader email={session.user.email} />

      <div className="mb-8 space-y-3">
        <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight">{deck.title}</h1>
            <p className="mt-1 text-muted-foreground">
              {deck.cards.length} words
              {dueCount ? ` · ${dueCount} due` : ""}
            </p>
          </div>
          <DeleteDeckButton deckId={deck.id} />
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {dueCount > 0 ? (
            <Link
              href={`/study/${deck.id}`}
              className="inline-flex h-10 items-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900"
            >
              Study due
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing due in this list.</p>
          )}
        </div>
      </div>

      {deck.cards.length > 0 ? (
        <section className="mb-12">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Words
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white/80">
            {deck.cards.map((card) => (
              <li
                key={card.id}
                className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{card.front}</span>
                <span className="text-right text-muted-foreground">{card.back}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Add more words</h2>
        <ImportForm deckId={deck.id} />
      </section>
    </main>
  );
}
