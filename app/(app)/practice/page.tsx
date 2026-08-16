import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ChevronRight,
  Headphones,
  Keyboard,
  Languages,
  Puzzle,
  Sparkles,
  Volume2,
  WholeWord,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Card } from "@/components/ui/card";
import {
  TRAININGS,
  type Training,
  type TrainingId,
} from "@/lib/practice/catalog";

/**
 * A chooser, not a wall of tiles: one grouped list per section, icon then
 * title, so every format is on screen at once. Icons live here rather than
 * in the catalog — same split as the sidebar, so `lib/practice` stays free
 * of `lucide-react`.
 */
const TRAINING_ICONS: Record<TrainingId, LucideIcon> = {
  brainstorm: Sparkles,
  "word-to-translation": Languages,
  "translation-to-word": WholeWord,
  "audio-choice": Volume2,
  builder: Puzzle,
  listening: Headphones,
  typing: Keyboard,
};

export default async function PracticePage() {
  const t = await getTranslations("practice");
  const trainings = await getTranslations("trainings");
  const common = await getTranslations("common");
  const [brainstorm, ...rest] = TRAININGS;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="space-y-10">
        <Section title={t("learnNew")}>
          <TrainingGroup
            trainings={[brainstorm]}
            needsSound={common("needsSound")}
            titleOf={(id) => trainings(`${id}.title`)}
            descriptionOf={(id) => trainings(`${id}.description`)}
          />
        </Section>

        <Section title={t("practiseKnown")}>
          <TrainingGroup
            trainings={rest}
            needsSound={common("needsSound")}
            titleOf={(id) => trainings(`${id}.title`)}
            descriptionOf={(id) => trainings(`${id}.description`)}
          />
        </Section>
      </div>
    </PageContainer>
  );
}

function TrainingGroup({
  trainings,
  needsSound,
  titleOf,
  descriptionOf,
}: {
  trainings: readonly Training[];
  needsSound: string;
  titleOf: (id: TrainingId) => string;
  descriptionOf: (id: TrainingId) => string;
}) {
  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y divide-border">
        {trainings.map((training) => (
          <li key={training.id}>
            <TrainingRow
              training={training}
              needsSound={needsSound}
              title={titleOf(training.id)}
              description={descriptionOf(training.id)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TrainingRow({
  training,
  needsSound,
  title,
  description,
}: {
  training: Training;
  needsSound: string;
  title: string;
  description: string;
}) {
  const Icon = TRAINING_ICONS[training.id];

  return (
    <Link
      href={`/practice/${training.slug}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-soft">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-base leading-snug">{title}</span>
          {training.audio ? (
            <span className="text-brand-soft text-[0.65rem] font-medium tracking-widest uppercase">
              {needsSound}
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground block text-sm">{description}</span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/40"
        aria-hidden
      />
    </Link>
  );
}
