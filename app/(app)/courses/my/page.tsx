import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { PageBack } from "@/components/page-back";
import { Section } from "@/components/section";
import { Card } from "@/components/ui/card";
import { loadCourse } from "@/lib/courses/load";

export default async function MyCoursesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
    <Page>
      <PageHeader
        eyebrow="Courses"
        title="My courses"
        description="Courses you have started, and where you left off."
      />

      <Section
        title="In progress"
        hint={courses.length > 0 ? `${courses.length}` : undefined}
      >
        {courses.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing here until you start one. Grammar courses are next door.
          </p>
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
                            Done
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

      <PageBack href="/courses/grammar" label="Back to courses" />
    </Page>
  );
}
