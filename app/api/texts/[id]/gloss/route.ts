import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import {
  BudgetExceededError,
  conservativeInputTokenReservation,
  reconcileLlmUsage,
  reserveLlmUsage,
} from "@/lib/llm/budget";
import { llm } from "@/lib/llm/client";
import { buildGlossRequest } from "@/lib/llm/prompt";
import { cleanCell, looksTransliterated } from "@/lib/normalize";
import { getPrisma } from "@/lib/prisma";
import { allowFixedWindowAttempt } from "@/lib/rate-limit";
import { glossFor, withGloss } from "@/lib/texts/gloss-cache";
import { lemmatize } from "@/lib/texts/lemma";
import { parseText, sentenceAround } from "@/lib/texts/tokenize";

/**
 * What one word means in one sentence — docs/plans/reader.md §6.5. The only
 * paid path here, and one sentence is all that ever leaves the account.
 */

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ tokenId: z.string().min(1).max(20) });

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;

  const { id } = await params;
  const prisma = getPrisma();
  const text = await prisma.userText.findFirst({
    where: { id, userId },
    select: { body: true, glosses: true },
  });
  if (!text) {
    return jsonError("notFound", 404);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("invalidToken", 400);
  }
  const { tokenId } = parsed.data;

  const cached = glossFor(text.glosses, tokenId);
  if (cached) {
    return NextResponse.json({ gloss: cached, cached: true });
  }

  const paragraphs = parseText(text.body, lemmatize).paragraphs;
  const paragraph = paragraphs.find((candidate) =>
    candidate.tokens.some((token) => token.id === tokenId),
  );
  const token = paragraph?.tokens.find((candidate) => candidate.id === tokenId);
  if (!paragraph || !token) {
    return jsonError("invalidToken", 400);
  }

  if (!(await allowFixedWindowAttempt(`texts-gloss:${userId}`, 60, 60 * 60 * 1000))) {
    return jsonError("tooManyWrites", 429);
  }

  const client = llm();
  const modelRequest = buildGlossRequest({
    word: paragraph.text.slice(token.start, token.end),
    lemma: token.lemma,
    sentence: sentenceAround(paragraph.text, token),
  });

  let gloss: string;
  try {
    const counted = await client.messages.countTokens({
      model: modelRequest.model,
      messages: modelRequest.messages,
      system: modelRequest.system,
      output_config: modelRequest.output_config,
    });
    const reservation = {
      inputTokens: conservativeInputTokenReservation(
        modelRequest,
        counted.input_tokens,
      ),
      outputTokens: modelRequest.max_tokens,
    };
    await reserveLlmUsage(userId, reservation);

    const message = await client.messages.create(modelRequest);
    await reconcileLlmUsage(userId, reservation, {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    gloss = readGloss(message);
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return jsonError("tooManyTranslations", 429);
    }
    console.error("Gloss failed", error);
    return jsonError("translationFailed", 503);
  }

  if (!gloss) {
    return jsonError("noTranslationYet", 400);
  }

  await prisma.userText.update({
    where: { id },
    data: { glosses: withGloss(text.glosses, tokenId, gloss) },
  });

  return NextResponse.json({ gloss, cached: false });
}

function readGloss(message: { content: unknown }): string {
  const blocks = Array.isArray(message.content) ? message.content : [];
  const text = blocks
    .filter(
      (block): block is { type: "text"; text: string } =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type === "text",
    )
    .map((block) => block.text)
    .join("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "";
  }

  const value =
    typeof parsed === "object" && parsed !== null
      ? (parsed as { gloss?: unknown }).gloss
      : null;
  const gloss = typeof value === "string" ? cleanCell(value) : "";
  return looksTransliterated(gloss) ? "" : gloss;
}
