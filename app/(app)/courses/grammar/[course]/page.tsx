import { notFound } from "next/navigation";

import { CourseOutline } from "@/components/courses/course-outline";
import { PageContainer } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { courseOutline } from "@/lib/courses/course-view";
import { CourseContentError, loadCourse } from "@/lib/courses/load";
import { getPrisma } from "@/lib/prisma";

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

  const session = await auth();
  const lessonRows = session?.user?.id
    ? await getPrisma().userLesson.findMany({
        where: { userId: session.user.id, courseSlug },
        select: { lessonSlug: true, status: true },
      })
    : [];
  const completed = lessonRows
    .filter((row) => row.status === "completed")
    .map((row) => row.lessonSlug);

  return (
    <PageContainer container="list">
      <CourseOutline
        course={loaded.course}
        outline={courseOutline(courseSlug, loaded.lessons, completed)}
      />
    </PageContainer>
  );
}
