"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Headphones,
  Keyboard,
  Languages,
  ListOrdered,
  Puzzle,
  RotateCcw,
  Sparkles,
  Volume2,
  WholeWord,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  SourceBar,
  type Source,
  type SourceCounts,
} from "@/components/slova/source-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TRAININGS,
  type Training,
  type TrainingId,
} from "@/lib/practice/catalog";
import { DEFAULT_SOURCE_STATE, sourceQuery } from "@/lib/practice/source";

/**
 * Where a session starts.
 *
 * The page answers one question — what to practise — and then offers mixed
 * review, brainstorm, or a single format, all from the source bar. Verb forms
 * sit below that, as their own block: the 95 triples, not those words asked
 * another way.
 *
 * Icons live here rather than in the catalog — same split as the sidebar, so
 * `lib/practice` stays free of `lucide-react`.
 */
const TRAINING_ICONS: Record<TrainingId, LucideIcon> = {
  brainstorm: Sparkles,
  "word-to-translation": Languages,
  "translation-to-word": WholeWord,
  "audio-choice": Volume2,
  builder: Puzzle,
  listening: Headphones,
  typing: Keyboard,
  "verb-forms": ListOrdered,
};

/** Roughly half a minute a word for review, closer to a minute for new ones. */
const MINUTES_PER_WORD = { review: 0.5, brainstorm: 1.2 } as const;

export function PracticePage({
  progressLine,
}: {
  progressLine?: string | null;
}) {
  const t = useTranslations("practice");
  const trainings = useTranslations("trainings");
  const common = useTranslations("common");
  const router = useRouter();

  const [source, setSource] = useState<Source>({
    state: DEFAULT_SOURCE_STATE,
    setIds: [],
  });
  /*
   * The whole counts object, not two numbers pulled from it: the review card
   * follows whatever state the bar is on, and deriving on render keeps the two
   * from disagreeing when that state changes without a refetch.
   */
  const [counts, setCounts] = useState<SourceCounts | null>(null);
  const chosen = counts?.states[source.state] ?? 0;
  const fresh = counts?.states.new ?? 0;

  const formats = TRAININGS.filter(
    (training) => training.id !== "brainstorm" && training.id !== "verb-forms",
  );

  function open(slug: string, state = source.state) {
    router.push(`/practice/${slug}?${sourceQuery({ ...source, state })}`);
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className={progressLine ? "mb-3" : undefined}
      />
      {progressLine ? (
        <p className="text-muted-foreground mb-10 text-body">{progressLine}</p>
      ) : null}

      <SourceBar
        value={source}
        onChange={setSource}
        onCounts={setCounts}
        className="mt-7"
      />

      <SectionLabel>{t("startHere")}</SectionLabel>
      <div className="grid gap-3.5 lg:grid-cols-2">
        <ModeCard
          icon={RotateCcw}
          title={t("reviewTitle")}
          body={t("reviewBody")}
          meta={t("sessionMeta", {
            count: chosen,
            minutes: minutes(chosen, MINUTES_PER_WORD.review),
          })}
          action={t("reviewAction")}
          disabled={chosen === 0}
          onStart={() => open("word-translation")}
        />
        <ModeCard
          icon={Sparkles}
          title={trainings("brainstorm.title")}
          body={t("brainstormBody")}
          meta={t("sessionMeta", {
            count: fresh,
            minutes: minutes(fresh, MINUTES_PER_WORD.brainstorm),
          })}
          action={t("brainstormAction")}
          variant="outline"
          disabled={fresh === 0}
          /* Brainstorm is about words never asked before, whatever the bar says. */
          onStart={() => open("brainstorm", "new")}
        />
      </div>

      <SectionLabel>{t("orOneFormat")}</SectionLabel>
      <Card className="gap-0 overflow-hidden py-0">
        <ul className="divide-border-subtle divide-y">
          {formats.map((training) => (
            <li key={training.id}>
              <FormatRow
                training={training}
                title={trainings(`${training.id}.title`)}
                description={trainings(`${training.id}.description`)}
                needsSound={common("needsSound")}
                onOpen={() => open(training.slug)}
              />
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-muted-foreground mt-3 text-caption">
        {t("oneSourceNote")}
      </p>

      <SectionLabel>{t("verbFormsSection")}</SectionLabel>
      <ModeCard
        icon={ListOrdered}
        title={trainings("verb-forms.title")}
        body={t("verbFormsBody")}
        meta={t("verbFormsMeta")}
        action={t("verbFormsAction")}
        variant="outline"
        onStart={() => router.push("/practice/verb-forms")}
      />
    </PageContainer>
  );
}

function minutes(words: number, rate: number) {
  return Math.max(1, Math.round(words * rate));
}

/** An overline with a rule running off to the right, as in the mockup. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-overline text-eyebrow mt-10 mb-3.5 flex items-center gap-2.5">
      {children}
      <span aria-hidden className="bg-border h-px flex-1" />
    </h2>
  );
}

function ModeCard({
  icon: Icon,
  title,
  body,
  meta,
  action,
  variant = "default",
  disabled,
  onStart,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
  action: string;
  variant?: "default" | "outline";
  disabled?: boolean;
  onStart: () => void;
}) {
  return (
    <Card className="shadow-card flex flex-col gap-0 p-6">
      <span className="bg-accent text-accent-foreground mb-3.5 flex size-[34px] items-center justify-center rounded-[9px]">
        <Icon className="size-[17px]" strokeWidth={1.8} aria-hidden />
      </span>
      <h3 className="text-h2 mb-1.5">{title}</h3>
      <p className="text-muted-foreground mb-4 flex-1 text-body-sm">{body}</p>
      <p className="text-disabled-foreground mb-3.5 text-caption tabular-nums">
        {meta}
      </p>
      <Button
        variant={variant}
        className="self-start"
        disabled={disabled}
        onClick={onStart}
      >
        {action}
      </Button>
    </Card>
  );
}

function FormatRow({
  training,
  title,
  description,
  needsSound,
  onOpen,
}: {
  training: Training;
  title: string;
  description: string;
  needsSound: string;
  onOpen: () => void;
}) {
  const Icon = TRAINING_ICONS[training.id];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-ring hover:bg-muted flex w-full items-center gap-3.5 px-4.5 py-3.5 text-left transition-colors"
    >
      <span className="bg-accent text-accent-foreground flex size-[34px] shrink-0 items-center justify-center rounded-[9px]">
        <Icon className="size-4" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2.5">
          <span className="text-h4">{title}</span>
          {training.audio ? (
            <Badge
              variant="outline"
              className="text-disabled-foreground h-[18px] rounded-xs px-1.5 text-[10px] tracking-[0.1em] uppercase"
            >
              {needsSound}
            </Badge>
          ) : null}
        </span>
        <span className="text-muted-foreground block text-caption">
          {description}
        </span>
      </span>
      <ChevronRight
        className="text-disabled-foreground size-4 shrink-0"
        strokeWidth={1.9}
        aria-hidden
      />
    </button>
  );
}
