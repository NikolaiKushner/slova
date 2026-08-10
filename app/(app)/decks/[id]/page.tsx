import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DeckWords } from "@/components/deck-words";
import { DeleteDeckButton } from "@/components/delete-deck-button";
import { ImportForm } from "@/components/import-form";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { deckSummary, getNewAllowance } from "@/lib/study-queue";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function DeckPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const deck = await getPrisma().deck.findFirst({
    where: { id, userId: session.user.id },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });
  if (!deck) notFound();

  const now = new Date();
  const dueCount = deck.cards.filter(
    (c) => c.introducedAt !== null && c.dueAt <= now,
  ).length;
  const unseenCount = deck.cards.filter((c) => c.introducedAt === null).length;
  const allowance = await getNewAllowance(session.user.id, now);
  const studiable = dueCount + Math.min(unseenCount, allowance);
  const description = deckSummary(deck.cards.length, dueCount, unseenCount);

  return (
    <>
      <PageHeader
        eyebrow="List"
        title={deck.title}
        description={description}
        actions={
          <>
            {studiable > 0 ? (
              <Link
                href={`/study/${deck.id}`}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Study due
              </Link>
            ) : null}
            <DeleteDeckButton deckId={deck.id} />
          </>
        }
      />

      <div className="space-y-10">
        <Section title="Words" hint={`${deck.cards.length} saved`}>
          {deck.cards.length > 0 ? (
            <DeckWords
              words={deck.cards.map((card) => ({
                id: card.id,
                front: card.front,
                back: card.back,
              }))}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-white/50 px-3 py-8 text-center text-sm text-muted-foreground">
              This list is empty. Add words below.
            </p>
          )}
        </Section>

        <Section title="Add more words">
          <ImportForm deckId={deck.id} />
        </Section>
      </div>
    </>
  );
}
