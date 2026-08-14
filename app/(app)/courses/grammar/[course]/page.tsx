import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Card } from "@/components/ui/card";
import { CourseContentError, loadCourse } from "@/lib/courses/load";

type Params = { params: Promise<{ course: string }> };

/**
 * The steps of one grammar course. A lesson is a row, not a trophy: the
 * player is where the work happens, and this page only says what is next.
 */
export default async function CoursePage({ params }: Params) {
  const { course: courseSlug } = await params;

  let loaded;
  try {
    loaded = loadCourse(courseSlug);
  } catch (error) {
    if (error instanceof CourseContentError) notFound();
    throw error;
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Courses"
        title={loaded.course.title}
        description={loaded.course.titleRu}
      />

      <Section title="Lessons" hint={`${loaded.lessons.length}`}>
        <Card className="gap-0 py-0">
          <ol className="divide-y divide-border">
            {loaded.lessons.map((lesson, index) => (
              <li key={lesson.slug}>
                <Link
                  href={`/courses/grammar/${courseSlug}/${lesson.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <span className="text-muted-foreground w-6 shrink-0 text-sm tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display text-base leading-snug">
                      {lesson.title}
                    </span>
                    <span className="text-muted-foreground block text-sm">
                      {lesson.titleRu}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground/40"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </Section>
    </Page>
  );
}
