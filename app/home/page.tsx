import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { cards: true } },
      cards: {
        where: { dueAt: { lte: now } },
        select: { id: true },
      },
    },
  });

  const dueTotal = decks.reduce((sum, d) => sum + d.cards.length, 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-16">
      <AppHeader email={session.user.email} />

      <section className="mt-4 space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-800/70">
          Today
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          {dueTotal === 0
            ? "Nothing due"
            : `${dueTotal} word${dueTotal === 1 ? "" : "s"} ready`}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {dueTotal === 0
            ? "Paste a list from your tutor, or open a set and review later."
            : "A short session now keeps them sticky."}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {dueTotal > 0 ? (
            <Link
              href="/study"
              className="inline-flex h-10 items-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white transition hover:bg-teal-900"
            >
              Study now
            </Link>
          ) : null}
          <Link
            href="/import"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-5 text-sm font-medium transition hover:bg-white/80"
          >
            Add words
          </Link>
        </div>
      </section>

      <section className="mt-14 space-y-4">
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
                      {deck._count.cards} words
                      {deck.cards.length
                        ? ` · ${deck.cards.length} due`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm text-teal-800">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
