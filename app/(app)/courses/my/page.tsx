import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { PageBack } from "@/components/page-back";
import { Section } from "@/components/section";
import { Card } from "@/components/ui/card";
import { loadCourse } from "@/lib/courses/load";

export default async function MyCoursesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("courses");
  const common = await getTranslations("common");

  const rows = await getPrisma().userCourse.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
  });

  const courses = rows.flatMap((row) => {
    try {
      const loaded = loadCourse(row.courseSlug);
      return [
        {
          slug: row.courseSlug,
          title: loaded.course.title,
          titleRu: loaded.course.titleRu,
          href: row.lastLessonSlug
            ? `/courses/grammar/${row.courseSlug}/${row.lastLessonSlug}`
            : `/courses/grammar/${row.courseSlug}`,
          done: Boolean(row.completedAt),
        },
      ];
    } catch {
      return [];
    }
  });

  return (
    <PageContainer container="list">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("myTitle")}
        description={t("myDescription")}
      />

      <Section
        title={t("inProgress")}
        hint={courses.length > 0 ? `${courses.length}` : undefined}
      >
        {courses.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border">
              {courses.map((course) => (
                <li key={course.slug}>
                  <Link
                    href={course.href}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-base leading-snug">
                          {course.title}
                        </span>
                        {course.done ? (
                          <span className="text-brand-soft text-[0.65rem] font-medium tracking-widest uppercase">
                            {common("done")}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground block text-sm">
                        {course.titleRu}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground/40"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <PageBack href="/courses/grammar" label={t("backToCourses")} />
    </PageContainer>
  );
}
