import { notFound } from "next/navigation";

import { StoryReader } from "@/components/stories/story-reader";
import { getSession } from "@/lib/auth";
import { normalizeKey } from "@/lib/lexicon/key";
import { getPrisma } from "@/lib/prisma";
import { loadStory } from "@/lib/stories/load";
import type { DictionaryWord } from "@/lib/stories/select";
import { StoryContentError } from "@/lib/stories/validate";

type Params = { params: Promise<{ slug: string }> };

/**
 * One story. Unknown slugs 404 — the catalog is the list of what exists, per
 * the same reasoning as the grammar lesson route.
 */
export default async function StoryPage({ params }: Params) {
  const { slug } = await params;

  let story;
  try {
    story = loadStory(slug);
  } catch (error) {
    if (error instanceof StoryContentError) notFound();
    throw error;
  }

  const session = await getSession();
  const userId = session?.user?.id;

  const dictionary: Record<string, DictionaryWord> = {};
  if (userId) {
    const keys = [
      ...new Set(story.annotations.map((a) => normalizeKey(a.lemma))),
    ];
    const rows = await getPrisma().userWord.findMany({
      where: { userId, key: { in: keys } },
      select: { key: true, introducedAt: true, intervalDays: true },
    });
    for (const row of rows) {
      dictionary[row.key] = row;
    }
  }

  return <StoryReader story={story} dictionary={dictionary} />;
}
