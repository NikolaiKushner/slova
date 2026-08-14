import { z } from "zod";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { CourseContentError } from "@/lib/courses/load";
import { saveLessonProgress } from "@/lib/courses/progress";

const schema = z.object({
  courseSlug: z.string().min(1).max(80),
  lessonSlug: z.string().min(1).max(80),
  right: z.number().int().nonnegative().max(500),
  missedRuleIds: z.array(z.string().min(1).max(80)).max(50).default([]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
  }

  try {
    const record = await saveLessonProgress({
      userId: session.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof CourseContentError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
