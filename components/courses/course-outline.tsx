import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, ChevronLeft } from "lucide-react";

import { Eyebrow } from "@/components/slova/eyebrow";
import { LessonRow } from "@/components/slova/lesson-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { CourseMeta } from "@/content/courses/schema";
import type { CourseOutline as CourseOutlineView } from "@/lib/courses/course-view";

/**
 * The lesson list after picking a course.
 *
 * Three tops, one list: start the first lesson, continue the next unfinished
 * one, or a quiet bar when the course is done and the test can be retaken.
 */
export async function CourseOutline({
  course,
  outline,
}: {
  course: CourseMeta;
  outline: CourseOutlineView;
}) {
  const t = await getTranslations("courses");
  const common = await getTranslations("common");

  const badgeLabel = (badge: "start" | "continue" | null) => {
    if (badge === "start") return common("start");
    if (badge === "continue") return common("continue");
    return null;
  };

  return (
    <>
      <header>
        <Eyebrow>
          <Link
            href="/courses/grammar"
            className="hover:text-primary focus-ring -ml-1 inline-flex items-center gap-1 rounded-sm"
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.9} aria-hidden />
            {t("eyebrow")}
          </Link>
        </Eyebrow>
        <h1 className="text-h1" lang="en">
          {course.title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-[52ch]">
          {course.titleRu}
          {" · "}
          {t("levelLine", { level: course.level })}
          {" · "}
          {t("lessonsCount", { count: outline.total })}
        </p>
      </header>

      <div className="mt-6">
        {outline.state === "done" ? (
          <>
            <div className="border-success-border bg-success-bg text-success flex items-center gap-3 rounded-lg border px-4.5 py-3.5 text-body-sm">
              <Check className="size-4.5 shrink-0" strokeWidth={1.8} aria-hidden />
              <span>{t("courseComplete")}</span>
            </div>
            {outline.testHref ? (
              <div className="mt-5">
                <Button
                  variant="outline"
                  render={<Link href={outline.testHref} />}
                >
                  {t("retakeTest")}
                </Button>
              </div>
            ) : null}
          </>
        ) : outline.next ? (
          <>
            {outline.state === "progress" ? (
              <div className="mb-5 max-w-xs">
                <Progress
                  value={outline.progressPercent}
                  className="gap-0"
                  aria-label={t("lessonsDone", {
                    done: outline.doneCount,
                    total: outline.total,
                  })}
                />
                <p
                  className="text-muted-foreground mt-1.5 text-caption"
                  aria-live="polite"
                >
                  {t("lessonsDone", {
                    done: outline.doneCount,
                    total: outline.total,
                  })}
                </p>
              </div>
            ) : null}
            <Button render={<Link href={outline.next.href} />}>
              {outline.state === "fresh"
                ? common("start")
                : common("continue")}
              {": "}
              <span lang="en">{outline.next.title}</span>
            </Button>
          </>
        ) : null}
      </div>

      <div className="mt-10 mb-3.5 flex items-center gap-3">
        <h2 className="text-overline text-eyebrow">{t("lessons")}</h2>
        <Separator className="flex-1" />
      </div>

      <Card className="gap-0 py-0">
        <ul className="divide-border-subtle divide-y">
          {outline.lessons.map((lesson) => (
            <li key={lesson.slug}>
              <LessonRow
                index={lesson.index}
                title={lesson.title}
                titleRu={lesson.titleRu}
                href={lesson.href}
                kind={lesson.kind}
                minutesLabel={t("minutesShort", { minutes: lesson.estMinutes })}
                badgeLabel={badgeLabel(lesson.badge)}
                statusLabel={
                  lesson.kind === "done" ? common("done") : undefined
                }
              />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
