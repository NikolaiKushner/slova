"use client";

import { useState } from "react";
import Link from "next/link";

import {
  isExerciseBlock,
  type Lesson,
  type Rule,
} from "@/content/courses/schema";
import { BlockView } from "@/components/courses/block-view";
import {
  ExerciseView,
  GrammarFeedback,
  type GrammarAnswered,
} from "@/components/courses/exercise-view";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/section";

export function LessonPlayer({
  courseSlug,
  lesson,
  rules,
}: {
  courseSlug: string;
  lesson: Lesson;
  rules: Rule[];
}) {
  const theory = lesson.blocks.filter((block) => block.type !== "exercise");
  const exercises = lesson.blocks.filter(isExerciseBlock);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GrammarAnswered | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = exercises[index];
  const rule = current
    ? rules.find((item) => item.id === current.ruleId)
    : undefined;

  function handleNext() {
    if (!current || !result) return;
    const nextRight = right + (result.verdict === "correct" ? 1 : 0);
    const nextIndex = index + 1;
    setRight(nextRight);
    setResult(null);
    if (nextIndex >= exercises.length) {
      setFinished(true);
      return;
    }
    setIndex(nextIndex);
  }

  if (finished) {
    return (
      <Section title="This lesson" hint={`${right} of ${exercises.length}`}>
        <p className="text-muted-foreground">
          {right === exercises.length
            ? "Every one right."
            : "You can go through it again whenever you like."}
        </p>
        <div className="mt-4">
          <Button
            size="lg"
            render={<Link href={`/courses/grammar/${courseSlug}`} />}
          >
            Back to the course
          </Button>
        </div>
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
    <div className="space-y-10">
      {theory.length > 0 ? (
        <Section title="The rule">
          <div className="space-y-5">
            {theory.map((block, blockIndex) => (
              <BlockView key={`${block.type}-${blockIndex}`} block={block} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Practice" hint={`${index + 1} of ${exercises.length}`}>
        <div className="space-y-6">
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
        </div>
      </Section>
    </div>
  );
}
