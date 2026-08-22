import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  LibraryBig,
  Repeat2,
  ScrollText,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/layout/app-shell";
import { OverviewStats } from "@/components/overview-stats";
import { PageHeader } from "@/components/page-header";
import { MetricTile } from "@/components/progress/metric-tile";
import { ReviewChart } from "@/components/progress/review-chart";
import { StudyCalendar } from "@/components/progress/study-calendar";
import { TimeSplit } from "@/components/progress/time-split";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSession } from "@/lib/auth";
import { grammarCatalog } from "@/lib/courses/catalog";
import { getOverview } from "@/lib/overview";
import {
  getStudyActivity,
  studyDaysThisWeek,
  windowStart,
  type StudyActivity,
} from "@/lib/progress";
import {
  GRAMMAR_PREVIEW,
  MEMORY_MIN_WORDS,
  TIME_MIN_DAYS,
} from "@/lib/progress-config";
import { requestTimeZone } from "@/lib/request-timezone";
import { getReadingStats } from "@/lib/texts/reading-stats";

export default async function ProgressPage() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const t = await getTranslations("progress");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const tz = await requestTimeZone();
  const now = new Date();
  const [overview, activity, reading] = await Promise.all([
    getOverview(userId),
    getStudyActivity(userId, now, tz),
    getReadingStats(userId, windowStart(now)),
  ]);

  const showMemory =
    activity.memory !== null && activity.memoryWords >= MEMORY_MIN_WORDS;
  const weekDays = studyDaysThisWeek(activity.studiedDayKeys, now, tz);
  const hasActivity = activity.studiedDayKeys.length > 0;
  const showTime = activity.time.recordedDays >= TIME_MIN_DAYS;
  const courses = coursesOnProgress(activity, locale === "ru");
  const previewCourses = courses.slice(0, GRAMMAR_PREVIEW);
  const memoryPercent =
    showMemory && activity.memory !== null
      ? Math.round(activity.memory * 100)
      : null;
  const retentionPercent =
    activity.retentionMature === null
      ? null
      : Math.round(activity.retentionMature * 100);

  return (
    <PageContainer container="dashboard">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="mb-5 md:mb-6"
      />

      {overview.entries === 0 ? (
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
        <div className="@container flex flex-col gap-3 md:gap-4">
          <section className="grid grid-cols-1 min-[390px]:grid-cols-2 @min-[960px]:grid-cols-4 gap-3 md:gap-4">
            <MetricTile
              label={t("currentRun")}
              value={String(activity.streak)}
              secondary={t("recordDays", { count: activity.longest })}
              icon={CalendarCheck}
            />
            <MetricTile
              label={t("today")}
              value={String(activity.today)}
              secondary={
                activity.today === 0 ? t("nothingYet") : t("wordsPractised")
              }
              icon={Repeat2}
            />
            <MetricTile
              label={t("learned")}
              value={String(overview.learned)}
              secondary={t("ofEntries", { count: overview.entries })}
              icon={LibraryBig}
            />
            {showMemory && memoryPercent !== null ? (
              <MetricTile
                label={t("inMemory")}
                value={t("memoryPercent", { percent: memoryPercent })}
                secondary={
                  retentionPercent === null
                    ? t("schedulerForecast")
                    : `${t("schedulerForecast")} · ${t("retentionShort", {
                        percent: retentionPercent,
                      })}`
                }
                icon={ChartNoAxesColumn}
              />
            ) : (
              <MetricTile
                label={t("thisWeek")}
                value={String(weekDays)}
                secondary={t("calendar")}
                icon={CalendarDays}
              />
            )}
          </section>

          {reading.texts > 0 && reading.meanCoverage !== null ? (
            <section className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-3 md:gap-4">
              <MetricTile
                label={t("wordsRead")}
                value={String(reading.words)}
                secondary={t("inTexts", { count: reading.texts })}
                icon={ScrollText}
              />
              <MetricTile
                label={t("meanCoverage")}
                value={t("meanPercent", {
                  percent: Math.round(reading.meanCoverage),
                })}
                secondary={t("ofWhatYouRead")}
                icon={BookOpenCheck}
              />
            </section>
          ) : null}

          <section className="grid grid-cols-1 @min-[680px]:grid-cols-2 @min-[960px]:grid-cols-[minmax(0,1fr)_max-content_minmax(0,1fr)] gap-3 md:gap-4">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-h4">{t("vocabulary")}</CardTitle>
                <CardDescription>
                  {overview.phrases === 0
                    ? t("inDictionary", { words: overview.words })
                    : t("inDictionaryWithPhrases", {
                        words: overview.words,
                        phrases: overview.phrases,
                      })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OverviewStats overview={overview} />
              </CardContent>
              <CardFooter className="bg-transparent">
                <Button
                  variant="link"
                  className="px-0"
                  render={<Link href="/dictionary" />}
                >
                  {t("openMyWords")}
                </Button>
              </CardFooter>
            </Card>

            {hasActivity ? (
              <>
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-h4">{t("calendar")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StudyCalendar
                      studiedDayKeys={activity.studiedDayKeys}
                      reviewCountsByDay={activity.reviewCountsByDay}
                      dayKeysByKind={activity.dayKeysByKind}
                      timeZone={tz}
                    />
                  </CardContent>
                </Card>

                <Card className="min-w-0 @min-[680px]:col-span-2 @min-[960px]:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-h4">
                      {t("wordsPractisedTitle")}
                    </CardTitle>
                    <CardDescription>{t("wordsPractisedHint")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReviewChart
                      data={activity.reviewsByDay}
                      timeZone={tz}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="@min-[680px]:col-span-1 @min-[960px]:col-span-2 min-w-0">
                <CardHeader>
                  <CardTitle className="text-h4">{t("noActivityTitle")}</CardTitle>
                  <CardDescription>{t("noActivityBody")}</CardDescription>
                </CardHeader>
                <CardFooter className="bg-transparent">
                  <Button render={<Link href="/practice" />}>
                    {t("startTraining")}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </section>

          {previewCourses.length > 0 || activity.stubborn.length > 0 || showTime ? (
            <section className="flex flex-col gap-3 @min-[680px]:flex-row @min-[680px]:flex-wrap md:gap-4">
              {previewCourses.length > 0 ? (
                <Card className="min-w-0 flex-1 basis-[min(100%,20rem)] pb-0">
                  <CardHeader>
                    <CardTitle className="text-h4">{t("courses")}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <ul className="divide-y divide-border">
                      {previewCourses.map((course) => {
                        const percent =
                          course.lessonCount === 0
                            ? 0
                            : Math.round(
                                (course.doneCount / course.lessonCount) * 100,
                              );
                        return (
                          <li key={course.slug}>
                            <Link
                              href={course.href}
                              aria-label={t("openCourse", { title: course.title })}
                              className="flex items-center gap-3 px-(--card-spacing) py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-baseline gap-x-2">
                                  <span
                                    lang={course.lang}
                                    className="font-display text-h4 leading-snug"
                                  >
                                    {course.title}
                                  </span>
                                  {course.completed ? (
                                    <span className="text-overline text-eyebrow">
                                      {common("done")}
                                    </span>
                                  ) : null}
                                </span>
                                <div className="text-muted-foreground mt-1 flex flex-col gap-1.5 text-caption">
                                  <span>
                                    {t("lessonsDone", {
                                      done: course.doneCount,
                                      total: course.lessonCount,
                                    })}
                                  </span>
                                  <Progress
                                    value={percent}
                                    className="gap-0"
                                    aria-label={t("lessonsDone", {
                                      done: course.doneCount,
                                      total: course.lessonCount,
                                    })}
                                  />
                                </div>
                              </div>
                              <ChevronRight
                                className="text-muted-foreground size-[15px] shrink-0"
                                strokeWidth={1.9}
                                aria-hidden
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  {courses.length > GRAMMAR_PREVIEW ? (
                    <CardFooter className="bg-transparent">
                      <Button
                        variant="link"
                        className="px-0"
                        render={<Link href="/courses/grammar" />}
                      >
                        {t("viewAllGrammar")}
                      </Button>
                    </CardFooter>
                  ) : null}
                </Card>
              ) : null}

              {activity.stubborn.length > 0 ? (
                <Card className="min-w-0 flex-1 basis-[min(100%,20rem)]">
                  <CardHeader>
                    <CardTitle className="text-h4">
                      {t("needsAttention")}
                    </CardTitle>
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
                  <CardFooter className="bg-transparent">
                    <Button
                      variant="link"
                      className="px-0"
                      render={<Link href="/dictionary" />}
                    >
                      {t("openMyWords")}
                    </Button>
                  </CardFooter>
                </Card>
              ) : null}

              {showTime ? (
                <Card className="min-w-0 flex-1 basis-[min(100%,20rem)]">
                  <CardHeader>
                    <CardTitle className="text-h4">{t("timeTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSplit time={activity.time} />
                  </CardContent>
                </Card>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}

function coursesOnProgress(activity: StudyActivity, russian: boolean) {
  const bySlug = new Map(
    grammarCatalog().available.map((course) => [course.slug, course]),
  );
  return activity.courses
    .flatMap((row) => {
      const course = bySlug.get(row.slug);
      if (!course) return [];
      return [
        {
          slug: row.slug,
          title: russian ? course.titleRu : course.title,
          lang: russian ? undefined : "en",
          href: course.href,
          completed: row.completed || row.completedLessons >= course.lessonCount,
          doneCount: row.completedLessons,
          lessonCount: course.lessonCount,
        },
      ];
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed));
}
