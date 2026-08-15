import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

export default async function CoursesGrammarPage() {
  const t = await getTranslations("courses");
  const common = await getTranslations("common");
  const groups = grammarCatalog();

  return (
    <Page>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("grammarTitle")}
        description={t("grammarDescription")}
      />

      <div className="space-y-10">
        {groups.map((group) => (
          <Section key={group.id} title={group.title} hint={group.titleRu}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {group.courses.map((course) => (
                <li key={course.slug} className="min-h-0">
                  <CourseTile
                    course={course}
                    coming={common("coming")}
                    levelLessons={
                      course.level && course.lessonCount !== null
                        ? t("levelLessons", {
                            level: course.level,
                            count: course.lessonCount,
                          })
                        : null
                    }
                  />
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </Page>
  );
}

function CourseTile({
  course,
  coming,
  levelLessons,
}: {
  course: CatalogCourse;
  coming: string;
  levelLessons: string | null;
}) {
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
        {course.status === "available" && levelLessons ? (
          <>
            <span>{levelLessons}</span>
            <ChevronRight
              className="size-4 text-muted-foreground/40"
              aria-hidden
            />
          </>
        ) : (
          <span className="text-brand-soft text-[0.65rem] font-medium tracking-widest uppercase">
            {coming}
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
