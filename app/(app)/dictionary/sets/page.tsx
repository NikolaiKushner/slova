import { Layers } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { setSummary } from "@/lib/study-queue";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSetCards } from "@/lib/set-queries";

export default async function SetsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("dictionary");
  const common = await getTranslations("common");
  const now = new Date();
  const sets = await getSetCards(session.user.id, now);

  return (
    <PageContainer container="list">
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
              return (
                <li key={set.id}>
                  <Link
                    href={`/dictionary/sets/${set.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/80 px-5 py-4 transition hover:border-primary/30 hover:bg-card"
                  >
                    <div>
                      <p className="font-medium text-foreground">{set.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {setSummary(set.total, set.due, set.unseen, {
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
    </PageContainer>
  );
}
