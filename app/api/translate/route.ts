import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { langCodeSchema, type LangCode } from "@/lib/languages";
import { translateText } from "@/lib/translate";

const schema = z.object({
  text: z.string().min(1).max(500),
  from: langCodeSchema,
  to: langCodeSchema,
});

const batchSchema = z.object({
  texts: z.array(z.string().min(1).max(500)).min(1).max(40),
  from: langCodeSchema,
  to: langCodeSchema,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  // Batch: { texts, from, to }
  if (body && Array.isArray(body.texts)) {
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
    }

    const results: { text: string; translation: string | null; error?: string }[] =
      [];

    for (const text of parsed.data.texts) {
      try {
        const translation = await translateText(
          text,
          parsed.data.from as LangCode,
          parsed.data.to as LangCode,
        );
        results.push({ text, translation });
        // Be gentle with free API
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        results.push({
          text,
          translation: null,
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    return NextResponse.json({ results });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const translation = await translateText(
      parsed.data.text,
      parsed.data.from as LangCode,
      parsed.data.to as LangCode,
    );
    return NextResponse.json({ translation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translate failed" },
      { status: 502 },
    );
  }
}
