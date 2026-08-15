import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LessonPlayer } from "@/components/courses/lesson-player";
import { PageBack } from "@/components/page-back";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { CourseContentError, loadCourse } from "@/lib/courses/load";

type Params = { params: Promise<{ course: string; lesson: string }> };

/**
 * One lesson of a grammar course. Unknown slugs 404 rather than rendering an
 * empty player — the catalog is the list of what exists, and a typed URL is
 * not a way to invent a fifth lesson.
 */
export default async function CourseLessonPage({ params }: Params) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const t = await getTranslations("courses");

  let loaded;
  try {
    loaded = loadCourse(courseSlug);
  } catch (error) {
    if (error instanceof CourseContentError) notFound();
    throw error;
  }

  const lesson = loaded.lessons.find((item) => item.slug === lessonSlug);
  if (!lesson) notFound();

  return (
    <Page>
      <PageHeader
        eyebrow={loaded.course.title}
        title={lesson.title}
        description={lesson.titleRu}
      />
      <LessonPlayer
        courseSlug={courseSlug}
        lesson={lesson}
        rules={loaded.rules}
      />
      <PageBack
        href={`/courses/grammar/${courseSlug}`}
        label={t("backToLessons")}
      />
    </Page>
  );
}
