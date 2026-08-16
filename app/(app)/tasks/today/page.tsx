import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { getStudySummary } from "@/lib/study-queue";
import { getProgress, progressLine } from "@/lib/progress";
import { getOverview } from "@/lib/overview";
import { OverviewStats } from "@/components/overview-stats";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const [summary, progress, overview, t] = await Promise.all([
    getStudySummary(session.user.id, now),
    getProgress(session.user.id, now),
    getOverview(session.user.id),
    getTranslations("today"),
  ]);

  const progressText = progressLine(progress.today, progress.streak, {
    reviewed: (count) => t("reviewedToday", { count }),
    streak: (count) => t("streak", { count }),
  });

  const title =
    summary.total === 0
      ? t("nothingDue")
      : t("wordsReady", { count: summary.total });

  let description: string;
  if (summary.total === 0) {
    description =
      summary.unseen > 0 ? t("newWordsDone") : t("pasteAList");
  } else if (summary.unseen > summary.allowance) {
    description = t("shortSessionRest");
  } else {
    description = t("shortSession");
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={title}
        description={description}
      />

      {progressText ? (
        <p className="text-overline text-eyebrow -mt-4">{progressText}</p>
      ) : null}

      <div className="mt-10">
        <OverviewStats overview={overview} />
      </div>

      {/*
       * The two things to do next, at the end of what the page has to say
       * rather than floated beside the title. Up there they sat in the empty
       * half of the header with nothing to belong to; here they read as the
       * answer to the numbers directly above them.
       *
       * "Study" goes to the trainings list, not straight into a session —
       * there are seven ways to be asked a word now, and picking one is part
       * of studying rather than a detour on the way to it.
       */}
      <div className="mt-10 flex flex-wrap gap-3">
        {summary.total > 0 ? (
          <Link
            href="/practice"
            className={buttonVariants({ size: "lg" })}
          >
            {t("studyNow")}
          </Link>
        ) : null}
        <Link
          href="/dictionary"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {t("addWords")}
        </Link>
      </div>
    </PageContainer>
  );
}
