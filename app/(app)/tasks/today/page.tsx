import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Page } from "@/components/page";
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
  const [summary, progress, overview] = await Promise.all([
    getStudySummary(session.user.id, now),
    getProgress(session.user.id, now),
    getOverview(session.user.id),
  ]);

  const progressText = progressLine(progress.today, progress.streak);

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
    <Page>
      <PageHeader
        eyebrow="Today"
        title={title}
        description={description}
      />

      {progressText ? (
        <p className="-mt-4 text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          {progressText}
        </p>
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
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-teal-800 text-white hover:bg-teal-900",
            )}
          >
            Study now
          </Link>
        ) : null}
        <Link
          href="/dictionary"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Add words
        </Link>
      </div>
    </Page>
  );
}
