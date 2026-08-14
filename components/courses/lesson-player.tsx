"use client";

import { useState } from "react";

import {
  isExerciseBlock,
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
  const theory = lesson.blocks.filter(
    (block): block is Exclude<typeof block, { type: "exercise" }> =>
      !isExerciseBlock(block),
  );
  const exercises = lesson.blocks.filter(isExerciseBlock);
  const [practicing, setPracticing] = useState(theory.length === 0);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GrammarAnswered | null>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

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
          total: exercises.length,
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
      <Section title="The rule">
        <TheoryView blocks={theory} />
        <div className="mt-6">
          <Button size="lg" onClick={() => setPracticing(true)}>
            Start practice
          </Button>
        </div>
      </Section>
    );
  }

  if (finished) {
    return (
      <Section title="This lesson" hint={`${right} of ${exercises.length}`}>
        <p className="text-muted-foreground">
          {right === exercises.length
            ? "Every one right."
            : "You can go through it again whenever you like."}
        </p>
      </Section>
    );
  }

  if (!current) {
    return (
      <Section title="This lesson">
        <p className="text-muted-foreground">This lesson has no exercises yet.</p>
      </Section>
    );
  }

  return (
    <Section
      title="Practice"
      hint={`${index + 1} of ${exercises.length}`}
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
          {result ? (
            <GrammarFeedback
              result={result}
              answer={current.answer}
              rule={rule}
              onNext={handleNext}
            />
          ) : null}
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
  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger render={<Button variant="ghost" />}>
        Show the rule
      </DrawerTrigger>
      <DrawerContent className="data-[swipe-axis=x]:[--drawer-content-width:min(32rem,92vw)]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>The rule</DrawerTitle>
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
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <TheoryView blocks={blocks} framed={false} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
