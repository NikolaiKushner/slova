import { Layers } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { setSummary } from "@/lib/study-queue";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function SetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("dictionary");
  const common = await getTranslations("common");
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
        eyebrow={t("eyebrow")}
        title={t("mySetsTitle")}
        description={t("mySetsDescription")}
        actions={
          <Link
            href="/dictionary"
            className={buttonVariants({ size: "lg" })}
          >
            {t("newSet")}
          </Link>
        }
      />

      <Section
        title={t("yourSets")}
        hint={sets.length > 0 ? `${sets.length}` : undefined}
      >
        {sets.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={t("noSetsTitle")}
            description={t("noSets")}
            action={
              <Button size="lg" render={<Link href="/dictionary" />}>
                {t("newSet")}
              </Button>
            }
          />
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
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/80 px-5 py-4 transition hover:border-primary/30 hover:bg-card"
                  >
                    <div>
                      <p className="font-medium text-foreground">{set.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {setSummary(set._count.items, due, unseen, {
                          words: (count) => t("summaryWords", { count }),
                          due: (count) => t("summaryDue", { count }),
                          unseen: (count) => t("summaryNew", { count }),
                          caughtUp: t("summaryCaughtUp"),
                        })}
                      </p>
                    </div>
                    <span className="text-sm text-primary">{common("open")}</span>
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
