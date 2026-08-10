import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { deckSummary, getStudySummary } from "@/lib/study-queue";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const userId = session.user.id;

  const [decks, dueByDeck, unseenByDeck, summary] = await Promise.all([
    prisma.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { cards: true } } },
    }),
    prisma.card.groupBy({
      by: ["deckId"],
      where: { deck: { userId }, introducedAt: { not: null }, dueAt: { lte: now } },
      _count: true,
    }),
    prisma.card.groupBy({
      by: ["deckId"],
      where: { deck: { userId }, introducedAt: null },
      _count: true,
    }),
    getStudySummary(userId, now),
  ]);

  const dueCounts = new Map(dueByDeck.map((r) => [r.deckId, r._count]));
  const unseenCounts = new Map(unseenByDeck.map((r) => [r.deckId, r._count]));

  const title =
    summary.total === 0
      ? "Nothing due"
      : `${summary.total} word${summary.total === 1 ? "" : "s"} ready`;

  let description: string;
  if (summary.total === 0) {
    description =
      summary.unseen > 0
        ? "Today's new words are done. The rest are waiting for tomorrow."
        : "Paste a list from your tutor, or open a set and review later.";
  } else if (summary.unseen > summary.allowance) {
    description = "A short session now keeps them sticky. The rest keeps.";
  } else {
    description = "A short session now keeps them sticky.";
  }

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title={title}
        description={description}
        actions={
          <>
            {summary.total > 0 ? (
              <Link
                href="/study"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-teal-800 text-white hover:bg-teal-900",
                )}
              >
                Study now
              </Link>
            ) : null}
            <Link
              href="/import"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Add words
            </Link>
          </>
        }
      />

      <section id="lists" className="scroll-mt-8 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Your lists</h2>
          <Link href="/import" className="text-sm text-teal-800 hover:underline">
            New list
          </Link>
        </div>

        {decks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-white/50 px-5 py-8 text-muted-foreground">
            No lists yet. Paste words from a tutor doc to begin.
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
      </section>
    </>
  );
}
