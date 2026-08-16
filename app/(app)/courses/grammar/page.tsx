import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { GrammarCatalog } from "@/components/courses/grammar-catalog";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { grammarCatalog } from "@/lib/courses/catalog";
import { withProgress } from "@/lib/courses/catalog-view";
import {
  CEFR_LEVEL_COOKIE,
  CEFR_SOURCE_COOKIE,
  parseCefrLevel,
  parseLevelSource,
} from "@/lib/courses/cefr";
import { loadCourseProgressMap } from "@/lib/courses/progress";

export default async function CoursesGrammarPage() {
  const t = await getTranslations("courses");
  const store = await cookies();
  const { available, coming } = grammarCatalog();

  const session = await auth();
  const progress = session?.user?.id
    ? await loadCourseProgressMap(
        session.user.id,
        available.map((course) => course.slug),
      )
    : new Map();

  const courses = available.map((course) =>
    withProgress(course, progress.get(course.slug)),
  );

  return (
    <PageContainer container="list">
      <PageHeader title={t("grammarTitle")} className="mb-0" />
      <GrammarCatalog
        courses={courses}
        coming={coming}
        initialLevel={parseCefrLevel(store.get(CEFR_LEVEL_COOKIE)?.value)}
        initialSource={parseLevelSource(store.get(CEFR_SOURCE_COOKIE)?.value)}
      />
    </PageContainer>
  );
}
