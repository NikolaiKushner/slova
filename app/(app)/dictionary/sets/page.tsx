import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { setSummary } from "@/lib/study-queue";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const sets = await getPrisma().wordSet.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      items: {
        select: { word: { select: { dueAt: true, introducedAt: true } } },
      },
    },
  });

  return (
    <Page>
      <PageHeader
        eyebrow="Dictionary"
        title="My sets"
        description="Lists you have imported. A word can sit in several of them and still be one word, with one schedule."
        actions={
          <Link
            href="/dictionary"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-teal-800 text-white hover:bg-teal-900",
            )}
          >
            New set
          </Link>
        }
      />

      <Section
        title="Your sets"
        hint={sets.length > 0 ? `${sets.length}` : undefined}
      >
        {sets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-white/50 px-5 py-8 text-muted-foreground">
            No sets yet. Paste words from a tutor doc to begin.
          </p>
        ) : (
          <ul className="space-y-2">
            {sets.map((set) => {
              const words = set.items.map((item) => item.word);
              const due = words.filter(
                (word) => word.introducedAt !== null && word.dueAt <= now,
              ).length;
              const unseen = words.filter(
                (word) => word.introducedAt === null,
              ).length;

              return (
                <li key={set.id}>
                  <Link
                    href={`/dictionary/sets/${set.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/80 px-5 py-4 transition hover:border-teal-800/30 hover:bg-white"
                  >
                    <div>
                      <p className="font-medium text-foreground">{set.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {setSummary(set._count.items, due, unseen)}
                      </p>
                    </div>
                    <span className="text-sm text-teal-800">Open</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
