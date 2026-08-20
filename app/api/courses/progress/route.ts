import { z } from "zod";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { requestTimeZone } from "@/lib/request-timezone";
import { CourseContentError } from "@/lib/courses/load";
import {
  CourseProgressConflictError,
  saveLessonProgress,
} from "@/lib/courses/progress";

const schema = z.object({
  courseSlug: z.string().min(1).max(80),
  lessonSlug: z.string().min(1).max(80),
  operationId: z.string().uuid(),
  right: z.number().int().nonnegative().max(500),
  missedRuleIds: z.array(z.string().min(1).max(80)).max(50).default([]),
  sittingId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalidProgress", 400);
  }

  // The zone comes from the cookie beside the session, not from the body:
  // when a rule comes back is not the client's to declare.
  const timeZone = await requestTimeZone();

  try {
    const record = await saveLessonProgress({
      userId: session.user.id,
      ...parsed.data,
      timeZone,
    });
    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof CourseContentError) {
      return jsonError("notFound", 404);
    }
    if (error instanceof CourseProgressConflictError) {
      return jsonError("invalidProgress", 409);
    }
    throw error;
  }
}
