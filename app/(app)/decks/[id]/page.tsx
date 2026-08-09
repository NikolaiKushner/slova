import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DeleteDeckButton } from "@/components/delete-deck-button";
import { ImportForm } from "@/components/import-form";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const description = [
    `${deck.cards.length} word${deck.cards.length === 1 ? "" : "s"}`,
    dueCount ? `${dueCount} due` : "nothing due",
  ].join(" · ");

  return (
    <>
      <PageHeader
        eyebrow="List"
        title={deck.title}
        description={description}
        actions={
          <>
            {dueCount > 0 ? (
              <Link
                href={`/study/${deck.id}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-teal-800 text-white hover:bg-teal-900",
                )}
              >
                Study due
              </Link>
            ) : null}
            <DeleteDeckButton deckId={deck.id} />
          </>
        }
      />

      {deck.cards.length > 0 ? (
        <section className="mb-12">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
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
      ) : (
        <p className="mb-12 rounded-2xl border border-dashed border-border bg-white/50 px-5 py-8 text-muted-foreground">
          This list is empty. Add words below.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Add more words</h2>
        <ImportForm deckId={deck.id} />
      </section>
    </>
  );
}
