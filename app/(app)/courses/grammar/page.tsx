import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  grammarCatalog,
  type CatalogCourse,
} from "@/lib/courses/catalog";
import { cn } from "@/lib/utils";

export default function CoursesGrammarPage() {
  const groups = grammarCatalog();

  return (
    <Page>
      <PageHeader
        eyebrow="Courses"
        title="Grammar courses"
        description="Longer than a drill, shorter than a textbook. A rule explained, then used."
      />

      <div className="space-y-10">
        {groups.map((group) => (
          <Section key={group.id} title={group.title} hint={group.titleRu}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {group.courses.map((course) => (
                <li key={course.slug} className="min-h-0">
                  <CourseTile course={course} />
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </Page>
  );
}

function CourseTile({ course }: { course: CatalogCourse }) {
  const inner = (
    <Card
      className={cn(
        "h-full gap-0 py-0",
        course.href && "transition-colors hover:bg-muted/50",
      )}
    >
      <CardHeader className="flex-1 gap-1.5 py-5">
        <CardTitle
          className={cn(
            "font-display min-h-[1.75em] text-2xl font-normal tracking-tight",
            !course.href && "text-muted-foreground",
          )}
        >
          {course.title}
        </CardTitle>
        <CardDescription>{course.titleRu}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto min-h-11 justify-between text-sm">
        {course.status === "available" &&
        course.level &&
        course.lessonCount !== null ? (
          <>
            <span>
              {course.level} · {course.lessonCount} lessons
            </span>
            <ChevronRight
              className="size-4 text-muted-foreground/40"
              aria-hidden
            />
          </>
        ) : (
          <span className="text-brand-soft text-[0.65rem] font-medium tracking-widest uppercase">
            Coming
          </span>
        )}
      </CardFooter>
    </Card>
  );

  if (!course.href) {
    return <div className="h-full">{inner}</div>;
  }

  return (
    <Link
      href={course.href}
      className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {inner}
    </Link>
  );
}
