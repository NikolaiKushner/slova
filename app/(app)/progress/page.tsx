import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { MemoryLine } from "@/components/progress/memory-line";
import { ReviewChart } from "@/components/progress/review-chart";
import { StudyCalendar } from "@/components/progress/study-calendar";
import { OverviewStats } from "@/components/overview-stats";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { grammarCatalog } from "@/lib/courses/catalog";
import { getOverview } from "@/lib/overview";
import {
  getStudyActivity,
  type StudyActivity,
} from "@/lib/progress";
import { MEMORY_MIN_WORDS } from "@/lib/progress-config";
import { requestTimeZone } from "@/lib/request-timezone";

export default async function ProgressPage() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const t = await getTranslations("progress");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const tz = await requestTimeZone();
  const now = new Date();
  const [overview, activity] = await Promise.all([
    getOverview(userId),
    getStudyActivity(userId, now, tz),
  ]);

  const name = session.user?.name?.trim() || null;
  const showMemory =
    (activity.memory !== null && activity.memoryWords >= MEMORY_MIN_WORDS) ||
    activity.retentionMature !== null;
  const courses = coursesOnProgress(activity, locale === "ru");

  return (
    <PageContainer container="wide">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={name ? t("titleNamed", { name }) : t("title")}
      />

      {overview.words === 0 ? (
        <EmptyState
          variant="screen"
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Button size="lg" render={<Link href="/dictionary" />}>
              {t("addWords")}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-wrap gap-10">
              <Stat value={activity.streak} label={t("streak")} />
              <Stat value={activity.longest} label={t("record")} />
            </CardContent>
          </Card>

          <OverviewStats overview={overview} />

          <Card>
            <CardHeader>
              <CardTitle>{t("calendar")}</CardTitle>
              <CardDescription>{t("calendarHint")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-hidden">
              <StudyCalendar
                studiedDayKeys={activity.studiedDayKeys}
                reviewCountsByDay={activity.reviewCountsByDay}
                timeZone={tz}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("reviewsChart")}</CardTitle>
              <CardDescription>{t("reviewsChartHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewChart data={activity.reviewsByDay} timeZone={tz} />
            </CardContent>
          </Card>

          {showMemory ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("memory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <MemoryLine
                  memory={activity.memory}
                  memoryWords={activity.memoryWords}
                  retentionMature={activity.retentionMature}
                />
              </CardContent>
            </Card>
          ) : null}

          {activity.stubborn.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("stubborn")}</CardTitle>
                <CardDescription>{t("stubbornHint")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {activity.stubborn.map((word) => (
                    <li
                      key={word.id}
                      className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"
                    >
                      <span lang="en" className="font-display text-h4">
                        {word.front}
                      </span>
                      <span className="text-muted-foreground text-caption tabular-nums">
                        {t("lapses", { count: word.lapses })}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {courses.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("courses")}</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="divide-y divide-border">
                  {courses.map((course) => (
                    <li key={course.slug}>
                      <Link
                        href={course.href}
                        className="flex items-center gap-3 px-(--card-spacing) py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-display text-h4 leading-snug">
                              {course.title}
                            </span>
                            {course.completed ? (
                              <span className="text-overline text-eyebrow">
                                {common("done")}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground text-caption">
                            {t("lessonsDone", {
                              done: course.doneCount,
                              total: course.lessonCount,
                            })}
                          </span>
                        </span>
                        <ChevronRight
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div>
      <p className="font-display text-numeral tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-caption">{label}</p>
    </div>
  );
}

function coursesOnProgress(activity: StudyActivity, russian: boolean) {
  const bySlug = new Map(
    grammarCatalog().available.map((course) => [course.slug, course]),
  );
  return activity.courses.flatMap((row) => {
    const course = bySlug.get(row.slug);
    if (!course) return [];
    return [
      {
        slug: row.slug,
        title: russian ? course.titleRu : course.title,
        href: course.href,
        completed: row.completed || row.completedLessons >= course.lessonCount,
        doneCount: row.completedLessons,
        lessonCount: course.lessonCount,
      },
    ];
  });
}
