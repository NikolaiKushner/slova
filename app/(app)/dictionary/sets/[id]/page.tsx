import { BookText } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { SetWords } from "@/components/set-words";
import { DeleteSetButton } from "@/components/delete-set-button";
import { AddWordsPanel } from "@/components/add-words-panel";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { getNewAllowance, setSummary } from "@/lib/study-queue";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSetDetail } from "@/lib/set-queries";
import { requestTimeZone } from "@/lib/request-timezone";

type Props = { params: Promise<{ id: string }> };

export default async function SetPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("dictionary");
  const chrome = await getTranslations("chrome");
  const { id } = await params;
  const now = new Date();
  const set = await getSetDetail(session.user.id, id, now);
  if (!set) notFound();

  const timeZone = await requestTimeZone();
  const allowance = await getNewAllowance(session.user.id, now, timeZone);
  const studiable = set.due + Math.min(set.unseen, allowance);

  return (
    <PageContainer container="list">
      <PageHeader
        eyebrow={t("setEyebrow")}
        title={set.title}
        description={setSummary(set.words.length, set.due, set.unseen, {
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
          hint={t("wordsSaved", { count: set.words.length })}
        >
          {set.words.length > 0 ? (
            <SetWords
              setId={set.id}
              words={set.words}
            />
          ) : (
            <EmptyState
              icon={BookText}
              title={t("emptySetTitle")}
              description={t("emptySet")}
            />
          )}
        </Section>

        <Section title={t("addMore")}>
          <AddWordsPanel setId={set.id} />
        </Section>
      </div>
    </PageContainer>
  );
}
