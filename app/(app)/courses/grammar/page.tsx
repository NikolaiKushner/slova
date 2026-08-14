import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Card } from "@/components/ui/card";
import { grammarCatalog } from "@/lib/courses/catalog";
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
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {group.courses.map((course) => (
                  <li key={course.slug}>
                    {course.href ? (
                      <Link
                        href={course.href}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                      >
                        <CourseRow course={course} />
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground/40"
                          aria-hidden
                        />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <CourseRow course={course} muted />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
        ))}
      </div>
    </Page>
  );
}

function CourseRow({
  course,
  muted = false,
}: {
  course: {
    title: string;
    titleRu: string;
    status: "available" | "coming";
  };
  muted?: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn(
            "font-display text-base leading-snug",
            muted && "text-muted-foreground",
          )}
        >
          {course.title}
        </span>
        {course.status === "coming" ? (
          <span className="text-brand-soft text-[0.65rem] font-medium tracking-widest uppercase">
            Coming
          </span>
        ) : null}
      </span>
      <span className="text-muted-foreground block text-sm">{course.titleRu}</span>
    </span>
  );
}
