"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  isExerciseBlock,
  type Exercise,
  type Lesson,
  type Rule,
} from "@/content/courses/schema";
import { TheoryView } from "@/components/courses/block-view";
import {
  ExerciseView,
  GrammarFeedback,
  type GrammarAnswered,
} from "@/components/courses/exercise-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Section } from "@/components/section";
import {
  dealLessonPractice,
  lessonPool,
  practiceSessionSize,
} from "@/lib/courses/practice";
import { X } from "lucide-react";

export function LessonPlayer({
  courseSlug,
  lesson,
  rules,
}: {
  courseSlug: string;
  lesson: Lesson;
  rules: Rule[];
}) {
  const t = useTranslations("courses");
  const common = useTranslations("common");
  const theory = lesson.blocks.filter(
    (block): block is Exclude<typeof block, { type: "exercise" }> =>
      !isExerciseBlock(block),
  );
  const pool = lessonPool(lesson);
  const startsInPractice = theory.length === 0;
  const [exercises, setExercises] = useState<Exercise[]>(() =>
    startsInPractice
      ? dealLessonPractice(pool, {
          take: practiceSessionSize(lesson.slug, pool.length),
          rng: Math.random,
        })
      : [],
  );
  const [practicing, setPracticing] = useState(startsInPractice);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GrammarAnswered | null>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  function startPractice() {
    setExercises(
      dealLessonPractice(pool, {
        take: practiceSessionSize(lesson.slug, pool.length),
        rng: Math.random,
      }),
    );
    setPracticing(true);
  }

  const current = exercises[index];
  const rule = current
    ? rules.find((item) => item.id === current.ruleId)
    : undefined;

  async function handleNext() {
    if (!current || !result || saving) return;
    const nextRight = right + (result.verdict === "correct" ? 1 : 0);
    const nextMissed =
      result.verdict === "wrong"
        ? [...missed, current.ruleId]
        : missed;
    const nextIndex = index + 1;
    setRight(nextRight);
    setMissed(nextMissed);
    setResult(null);
    if (nextIndex >= exercises.length) {
      setSaving(true);
      await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug,
          lessonSlug: lesson.slug,
          right: nextRight,
          missedRuleIds: [...new Set(nextMissed)],
        }),
      }).catch(() => {
        // The lesson is still finished on this page; My courses can miss one
        // save, and a retry of the lesson writes it.
      });
      setFinished(true);
      return;
    }
    setIndex(nextIndex);
  }

  if (!practicing && theory.length > 0) {
    return (
      <Section title={t("theRule")}>
        <TheoryView blocks={theory} />
        <div className="mt-6">
          <Button size="lg" onClick={startPractice}>
            {t("startPractice")}
          </Button>
        </div>
      </Section>
    );
  }

  if (finished) {
    return (
      <Section
        title={t("thisLesson")}
        hint={common("of", { right, total: exercises.length })}
      >
        <p className="text-muted-foreground">
          {right === exercises.length ? t("everyRight") : t("tryAgain")}
        </p>
      </Section>
    );
  }

  if (!current) {
    return (
      <Section title={t("thisLesson")}>
        <p className="text-muted-foreground">{t("noExercises")}</p>
      </Section>
    );
  }

  return (
    <Section
      title={t("practice")}
      hint={common("of", { right: index + 1, total: exercises.length })}
      action={
        theory.length > 0 ? (
          <RuleDrawer title={lesson.title} blocks={theory} />
        ) : undefined
      }
    >
      <Card className="gap-0 py-0">
        <CardContent className="space-y-6 py-4">
          <ExerciseView
            key={current.id}
            exercise={current}
            onAnswered={setResult}
          />
          <GrammarFeedback
            result={result}
            answer={current.answer}
            rule={rule}
            onNext={handleNext}
          />
        </CardContent>
      </Card>
    </Section>
  );
}

function RuleDrawer({
  title,
  blocks,
}: {
  title: string;
  blocks: Exclude<Lesson["blocks"][number], { type: "exercise" }>[];
}) {
  const t = useTranslations("courses");
  const common = useTranslations("common");

  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger render={<Button variant="ghost" />}>
        {t("showTheRule")}
      </DrawerTrigger>
      <DrawerContent className="data-[swipe-axis=x]:[--drawer-content-width:min(32rem,92vw)]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>{t("theRule")}</DrawerTitle>
          <DrawerDescription>{title}</DrawerDescription>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
              />
            }
          >
            <X />
            <span className="sr-only">{common("close")}</span>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <TheoryView blocks={blocks} framed={false} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
