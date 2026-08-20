import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { GrammarReviewSession } from "@/components/courses/grammar-review-session";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import {
  loadGrammarReviewQueue,
  loadGrammarReviewSummary,
} from "@/lib/courses/review-store";
import { requestTimeZone } from "@/lib/request-timezone";

/**
 * Grammar Review — the rules this learner got wrong, brought back.
 *
 * A static segment beside `[course]`, and the static one wins. `review` is
 * never a course slug: it is not in the catalog and never reaches
 * `loadCourse`.
 *
 * The queue is read here rather than through a GET endpoint — there is one
 * reader, and it is a Server Component. Only the mutation is HTTP.
 */
export default async function GrammarReviewPage() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return <CaughtUp kind="empty" />;

  const now = new Date();
  const [queue, summary] = await Promise.all([
    loadGrammarReviewQueue(userId, now),
    loadGrammarReviewSummary(userId, now),
  ]);

  if (queue.length === 0) {
    return (
      <CaughtUp
        kind={summary.activeCount > 0 ? "caughtUp" : "empty"}
        nextDueAt={summary.nextDueAt}
      />
    );
  }

  return <GrammarReviewSession items={queue} />;
}

/**
 * Two different silences. Nothing was ever missed — a promise about what will
 * appear here. Everything is answered for now — when the next rule returns.
 */
async function CaughtUp({
  kind,
  nextDueAt,
}: {
  kind: "empty" | "caughtUp";
  nextDueAt?: Date | null;
}) {
  const t = await getTranslations("grammarReview");
  const [locale, timeZone] = await Promise.all([
    getLocale(),
    requestTimeZone(),
  ]);

  const description =
    kind === "empty"
      ? t("emptyBody")
      : nextDueAt
        ? t("caughtUpBody", {
            date: new Intl.DateTimeFormat(locale, {
              timeZone,
              day: "numeric",
              month: "long",
            }).format(nextDueAt),
          })
        : t("caughtUpBodyNoDate");

  return (
    <PageContainer container="focus">
      <EmptyState
        variant="screen"
        title={kind === "empty" ? t("emptyTitle") : t("caughtUpTitle")}
        description={description}
        action={
          <Button size="lg" render={<Link href="/courses/grammar" />}>
            {t("backToGrammar")}
          </Button>
        }
      />
    </PageContainer>
  );
}
