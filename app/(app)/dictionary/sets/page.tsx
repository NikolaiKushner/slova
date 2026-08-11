import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { deckSummary } from "@/lib/study-queue";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const userId = session.user.id;

  const [decks, dueByDeck, unseenByDeck] = await Promise.all([
    getPrisma().deck.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { cards: true } } },
    }),
    getPrisma().card.groupBy({
      by: ["deckId"],
      where: {
        deck: { userId },
        introducedAt: { not: null },
        dueAt: { lte: now },
      },
      _count: true,
    }),
    getPrisma().card.groupBy({
      by: ["deckId"],
      where: { deck: { userId }, introducedAt: null },
      _count: true,
    }),
  ]);

  const dueCounts = new Map(dueByDeck.map((r) => [r.deckId, r._count]));
  const unseenCounts = new Map(unseenByDeck.map((r) => [r.deckId, r._count]));

  return (
    <Page>
      <PageHeader
        eyebrow="Dictionary"
        title="My sets"
        description="Lists you have imported. A word can sit in several of them and still be one word."
        actions={
          <Link
            href="/dictionary/add"
            className={cn(buttonVariants({ size: "lg" }), "bg-teal-800 text-white hover:bg-teal-900")}
          >
            New set
          </Link>
        }
      />

      <Section title="Your sets" hint={decks.length > 0 ? `${decks.length}` : undefined}>
        {decks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-white/50 px-5 py-8 text-muted-foreground">
            No sets yet. Paste words from a tutor doc to begin.
          </p>
        ) : (
          <ul className="space-y-2">
            {decks.map((deck) => (
              <li key={deck.id}>
                <Link
                  href={`/decks/${deck.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/80 px-5 py-4 transition hover:border-teal-800/30 hover:bg-white"
                >
                  <div>
                    <p className="font-medium text-foreground">{deck.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {deckSummary(
                        deck._count.cards,
                        dueCounts.get(deck.id) ?? 0,
                        unseenCounts.get(deck.id) ?? 0,
                      )}
                    </p>
                  </div>
                  <span className="text-sm text-teal-800">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
