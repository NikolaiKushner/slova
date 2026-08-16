"use client";

import { useId } from "react";
import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Rule, RuleCard } from "@/content/courses/schema";
import { mdToNodes } from "@/lib/courses/md";
import { cn } from "@/lib/utils";

/**
 * The compact rule under a practice question.
 *
 * It sits below the footer so opening it does not shove the options. A miss
 * opens it and marks the row that belongs to the rule just failed; the
 * learner can still toggle it by hand (or with R).
 */
export function PracticeRuleCard({
  open,
  auto,
  courseTitle,
  lessonTitle,
  card,
  rule,
  markedRuleId,
  onToggle,
  onOpenLesson,
}: {
  open: boolean;
  auto: boolean;
  courseTitle: string;
  lessonTitle: string;
  card: RuleCard | undefined;
  rule: Rule | undefined;
  markedRuleId: string | null;
  onToggle: () => void;
  onOpenLesson?: () => void;
}) {
  const t = useTranslations("courses");
  const note = auto && rule ? rule.anchorMd : card?.note;
  const bodyId = useId();

  return (
    <div className="border-border mt-7 border-t pt-3.5">
      <button
        type="button"
        className="focus-ring text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <BookOpen className="size-[15px] shrink-0" strokeWidth={1.8} aria-hidden />
        <span>{t("theRule")}</span>
        {auto ? (
          <span className="text-caption text-warning bg-warning-bg border-warning-border rounded-sm border px-1.5 py-px">
            {t("ruleOpenedOnMiss")}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto size-[15px] shrink-0 transition-transform duration-(--motion-fast)",
            open && "rotate-180",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <div
        id={bodyId}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--motion-base) ease-(--ease-standard)",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/*
          Collapsed rows are 0px tall but otherwise fully present: without
          `inert` the "open the lesson" button is still reachable by Tab and
          a screen reader still reads the rule out — handing the answer to
          the one person who did not ask for it.
        */}
        <div className="overflow-hidden" inert={!open}>
          <div className="bg-card border-border mt-2 rounded-lg border px-4.5 py-4">
            <p className="text-overline text-muted-foreground mb-3">
              <span lang="en">{courseTitle}</span>
              {" · "}
              <span lang="en">{lessonTitle}</span>
            </p>

            {card ? (
              <div>
                {card.rows.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between gap-3.5 rounded-md px-2.5 py-2 text-body-sm transition-colors duration-(--motion-fast)",
                      markedRuleId &&
                        row.ruleId === markedRuleId &&
                        "bg-warning-bg shadow-[inset_2px_0_0_var(--warning)]",
                    )}
                  >
                    <span>{row.label}</span>
                    <span lang="en" className="text-token">
                      {mdToNodes(row.form)}
                    </span>
                  </div>
                ))}
              </div>
            ) : rule ? (
              <p className="text-body-sm">{rule.title}</p>
            ) : null}

            {note ? (
              <p className="text-muted-foreground border-border-subtle mt-3 border-t pt-3 text-body-sm">
                {mdToNodes(note)}
              </p>
            ) : null}

            {onOpenLesson ? (
              <button
                type="button"
                className="text-primary mt-2.5 inline-flex items-center gap-1.5 text-body-sm hover:underline"
                onClick={onOpenLesson}
              >
                {t("openFullLesson")}
                <ArrowRight className="size-[13px]" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
