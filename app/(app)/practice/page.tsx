import Link from "next/link";
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

import { Page } from "@/components/page";
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

export default function PracticePage() {
  const [brainstorm, ...rest] = TRAININGS;

  return (
    <Page>
      <PageHeader
        eyebrow="Practice"
        title="Trainings"
        description="Every format asks the same words a different way — recognising one is easy, writing it from memory is not."
      />

      <div className="space-y-10">
        <Section title="Learn new words">
          <TrainingGroup trainings={[brainstorm]} />
        </Section>

        <Section title="Practise what you know">
          <TrainingGroup trainings={rest} />
        </Section>
      </div>
    </Page>
  );
}

function TrainingGroup({ trainings }: { trainings: readonly Training[] }) {
  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y divide-border">
        {trainings.map((training) => (
          <li key={training.id}>
            <TrainingRow training={training} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TrainingRow({ training }: { training: Training }) {
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
          <span className="font-display text-base leading-snug">
            {training.title}
          </span>
          {training.audio ? (
            <span className="text-brand-soft text-[0.65rem] font-medium tracking-widest uppercase">
              Needs sound
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground block text-sm">
          {training.description}
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/40"
        aria-hidden
      />
    </Link>
  );
}
