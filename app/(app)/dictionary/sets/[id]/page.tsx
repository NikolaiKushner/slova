import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { SetWords } from "@/components/set-words";
import { DeleteSetButton } from "@/components/delete-set-button";
import { AddWordsPanel } from "@/components/add-words-panel";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { getNewAllowance, setSummary } from "@/lib/study-queue";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function SetPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("dictionary");
  const chrome = await getTranslations("chrome");
  const { id } = await params;
  const set = await getPrisma().wordSet.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: { orderBy: { addedAt: "asc" }, include: { word: true } },
    },
  });
  if (!set) notFound();

  const words = set.items.map((item) => item.word);
  const now = new Date();
  const dueCount = words.filter(
    (word) => word.introducedAt !== null && word.dueAt <= now,
  ).length;
  const unseenCount = words.filter((word) => word.introducedAt === null).length;
  const allowance = await getNewAllowance(session.user.id, now);
  const studiable = dueCount + Math.min(unseenCount, allowance);

  return (
    <Page>
      <PageHeader
        eyebrow={t("setEyebrow")}
        title={set.title}
        description={setSummary(words.length, dueCount, unseenCount, {
          words: (count) => t("summaryWords", { count }),
          due: (count) => t("summaryDue", { count }),
          unseen: (count) => t("summaryNew", { count }),
          caughtUp: t("summaryCaughtUp"),
        })}
        actions={
          <>
            {studiable > 0 ? (
              <Link
                href={`/study/${set.id}`}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                {t("studyDue")}
              </Link>
            ) : null}
            <DeleteSetButton setId={set.id} />
          </>
        }
      />

      <div className="space-y-10">
        <Section
          title={chrome("words")}
          hint={t("wordsSaved", { count: words.length })}
        >
          {words.length > 0 ? (
            <SetWords
              setId={set.id}
              words={words.map((word) => ({
                id: word.id,
                front: word.front,
                back: word.back,
              }))}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-white/50 px-3 py-8 text-center text-sm text-muted-foreground">
              {t("emptySet")}
            </p>
          )}
        </Section>

        <Section title={t("addMore")}>
          <AddWordsPanel setId={set.id} />
        </Section>
      </div>
    </Page>
  );
}
