import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { loadAllStories, loadCatalog } from "@/lib/stories/load";
import { orderStories, type OrderedStory } from "@/lib/stories/select";

/**
 * `/stories` catalog — docs/design-system.md §15.8, docs/plans/stories.md §6.2.
 *
 * No "Прочитанные" section yet: `StoryProgress` doesn't exist until Phase 3,
 * so nothing can ever be completed. Building an Accordion that can never
 * show a row would be dead UI, not a feature — it lands with the migration.
 */
export default async function StoriesPage() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const t = await getTranslations("stories");
  const prisma = getPrisma();
  const dictionary = await prisma.userWord.findMany({
    where: { userId },
    select: { key: true, introducedAt: true, intervalDays: true },
  });

  const stories = loadAllStories();
  const catalog = loadCatalog();
  const ordered = orderStories(stories, catalog, dictionary);

  // §5.3: the catalog is never empty, so there is no empty state to design.
  const [next, ...rest] = ordered;

  return (
    <PageContainer container="list">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="space-y-10">
        <NextStoryCard story={next} />

        {rest.length > 0 ? (
          <Section title={t("allStories")}>
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {rest.map((story) => (
                  <li key={story.slug}>
                    <StoryRow story={story} />
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
        ) : null}
      </div>
    </PageContainer>
  );
}

async function NextStoryCard({ story }: { story: OrderedStory }) {
  const t = await getTranslations("stories");

  return (
    <div className="rounded-xl bg-sidebar px-6 py-5.5 shadow-[inset_2px_0_0_var(--primary)] md:px-7 md:py-6">
      <p className="text-overline text-eyebrow">{t("continueReading")}</p>
      <h2 className="text-h3 mt-1.5" lang="en">
        {story.title}
      </h2>
      <p className="text-body-sm mt-1.5 text-muted-foreground">
        {story.descriptionRu}
      </p>
      <p className="text-caption tnum mt-3 text-foreground">
        {storyFacts(story, t).join(" · ")}
      </p>
      <Button size="lg" className="mt-4" render={<Link href={`/stories/${story.slug}`} />}>
        {t("readButton")}
      </Button>
    </div>
  );
}

async function StoryRow({ story }: { story: OrderedStory }) {
  const t = await getTranslations("stories");

  return (
    <Link
      href={`/stories/${story.slug}`}
      aria-label={t("openStory", { title: story.title })}
      className="focus-ring coarse:py-3.5 flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-2">
          <Badge variant="secondary" className="rounded-xs px-1.5 tracking-[0.08em]">
            {story.level}
          </Badge>
          <span className="text-h4" lang="en">
            {story.title}
          </span>
        </span>
        <span className="text-muted-foreground text-caption mt-1 block">
          {story.descriptionRu}
        </span>
      </span>
      <span className="text-muted-foreground text-caption tnum shrink-0 whitespace-nowrap">
        {t("minutesShort", { minutes: story.estimatedMinutes })}
      </span>
      <ChevronRight
        className="text-muted-foreground size-[15px] shrink-0"
        strokeWidth={1.9}
        aria-hidden
      />
    </Link>
  );
}

/** The facts line every card/row copy pulls from — §5.3: level, time, and the counts that are the point of the card. */
function storyFacts(
  story: OrderedStory,
  t: Awaited<ReturnType<typeof getTranslations<"stories">>>,
): string[] {
  const facts = [story.level, t("minutesShort", { minutes: story.estimatedMinutes })];
  if (story.counts.yours > 0) {
    facts.push(t("yourWordsCount", { count: story.counts.yours }));
  }
  if (story.counts.new > 0) {
    facts.push(t("newWordsCount", { count: story.counts.new }));
  }
  return facts;
}
