import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { GrammarCatalog } from "@/components/courses/grammar-catalog";
import { GrammarReviewCard } from "@/components/courses/grammar-review-card";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { grammarCatalog } from "@/lib/courses/catalog";
import { withProgress } from "@/lib/courses/catalog-view";
import {
  CEFR_LEVEL_COOKIE,
  CEFR_SOURCE_COOKIE,
  parseCefrLevel,
  parseLevelSource,
} from "@/lib/courses/cefr";
import { loadCourseProgressMap } from "@/lib/courses/progress";
import { loadGrammarReviewSummary } from "@/lib/courses/review-store";

export default async function CoursesGrammarPage() {
  const t = await getTranslations("courses");
  const store = await cookies();
  const { available, coming } = grammarCatalog();

  const session = await getSession();
  const userId = session?.user?.id;
  const [progress, review] = userId
    ? await Promise.all([
        loadCourseProgressMap(
          userId,
          available.map((course) => course.slug),
        ),
        loadGrammarReviewSummary(userId, new Date()),
      ])
    : [new Map(), null];

  const courses = available.map((course) =>
    withProgress(course, progress.get(course.slug)),
  );

  return (
    <PageContainer container="list">
      <PageHeader
        title={t("grammarTitle")}
        className="mb-0"
        actions={
          <Link
            href="/courses/my"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("myTitle")}
          </Link>
        }
      />
      {review ? (
        <GrammarReviewCard
          dueCount={review.dueCount}
          courseCount={review.dueCourseTitles.length}
        />
      ) : null}
      <GrammarCatalog
        courses={courses}
        coming={coming}
        initialLevel={parseCefrLevel(store.get(CEFR_LEVEL_COOKIE)?.value)}
        initialSource={parseLevelSource(store.get(CEFR_SOURCE_COOKIE)?.value)}
      />
    </PageContainer>
  );
}
