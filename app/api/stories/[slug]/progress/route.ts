import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { loadStory } from "@/lib/stories/load";
import {
  completeStory,
  saveStoryAnswer,
  StoryProgressError,
} from "@/lib/stories/progress";
import { StoryContentError } from "@/lib/stories/validate";

/**
 * Progress for one story — docs/plans/shipped/stories.md §5.5. Grading happens on
 * the client (§3.4, like courses): this route only records the verdict it
 * is handed, the same trust boundary `/api/courses/progress` already draws.
 */

type Params = { params: Promise<{ slug: string }> };

const answerSchema = z.object({
  action: z.literal("answer"),
  questionId: z.string().min(1),
  answer: z.string().min(1).max(500),
  correct: z.boolean(),
});

const completeSchema = z.object({ action: z.literal("complete") });

const schema = z.discriminatedUnion("action", [answerSchema, completeSchema]);

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;

  const { slug } = await params;
  let story;
  try {
    story = loadStory(slug);
  } catch (error) {
    if (error instanceof StoryContentError) {
      return jsonError("notFound", 404);
    }
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("invalidProgress", 400);
  }

  try {
    if (parsed.data.action === "answer") {
      const questionIds = new Set(story.questions.map((q) => q.id));
      if (!questionIds.has(parsed.data.questionId)) {
        return jsonError("invalidProgress", 400);
      }
      const record = await saveStoryAnswer({
        userId,
        storySlug: slug,
        questionId: parsed.data.questionId,
        answer: parsed.data.answer,
        correct: parsed.data.correct,
      });
      return NextResponse.json({ record });
    }

    const record = await completeStory({
      userId,
      storySlug: slug,
      questionIds: story.questions.map((q) => q.id),
    });
    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof StoryProgressError) {
      return jsonError("invalidProgress", 409);
    }
    throw error;
  }
}
