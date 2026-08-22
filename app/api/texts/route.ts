import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import { allowFixedWindowAttempt } from "@/lib/rate-limit";
import {
  MAX_TEXT_CHARS,
  MAX_TEXTS,
  MAX_TITLE_CHARS,
  titleFrom,
} from "@/lib/texts/draft";
import { parseText } from "@/lib/texts/tokenize";

/**
 * Keep a pasted text — docs/plans/shipped/reader.md §5.2. Tokenizing here is only for
 * the counts; the reader tokenizes again, which beat storing the answer.
 */

const schema = z.object({
  title: z.string().trim().max(MAX_TITLE_CHARS).optional(),
  body: z.string().trim().min(1).max(MAX_TEXT_CHARS),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("invalidText", 400);
  }

  if (!(await allowFixedWindowAttempt(`texts-create:${userId}`, 20, 60 * 60 * 1000))) {
    return jsonError("tooManyWrites", 429);
  }

  const prisma = getPrisma();
  if ((await prisma.userText.count({ where: { userId } })) >= MAX_TEXTS) {
    return jsonError("tooManyTexts", 400);
  }

  const { body } = parsed.data;
  const title = parsed.data.title || titleFrom(body);
  if (!title) {
    return jsonError("invalidText", 400);
  }

  const text = await prisma.userText.create({
    data: {
      userId,
      title,
      body,
      wordCount: parseText(body).wordCount,
      charCount: body.length,
    },
    select: { id: true },
  });

  return NextResponse.json({ text }, { status: 201 });
}
