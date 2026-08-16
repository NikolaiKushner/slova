import { notFound } from "next/navigation";

import { LessonSession } from "@/components/courses/lesson-player";
import { CourseContentError, loadCourse } from "@/lib/courses/load";

type Params = { params: Promise<{ course: string; lesson: string }> };

/**
 * One lesson of a grammar course. Unknown slugs 404 rather than rendering an
 * empty player — the catalog is the list of what exists, and a typed URL is
 * not a way to invent a fifth lesson.
 */
export default async function CourseLessonPage({ params }: Params) {
  const { course: courseSlug, lesson: lessonSlug } = await params;

  let loaded;
  try {
    loaded = loadCourse(courseSlug);
  } catch (error) {
    if (error instanceof CourseContentError) notFound();
    throw error;
  }

  const lessonIndex = loaded.lessons.findIndex((item) => item.slug === lessonSlug);
  const lesson = loaded.lessons[lessonIndex];
  if (!lesson) notFound();

  return (
    <LessonSession
      courseSlug={courseSlug}
      courseTitle={loaded.course.title}
      lesson={lesson}
      rules={loaded.rules}
      lessonIndex={lessonIndex}
      lessonCount={loaded.lessons.length}
    />
  );
}
