"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

import type { Exercise, Lesson, Rule } from "@/content/courses/schema";
import { isTheoryBlock } from "@/content/courses/schema";
import { TheoryView } from "@/components/courses/block-view";
import {
  GrammarQuestion,
  taskKey,
  type GrammarAnswered,
} from "@/components/courses/exercise-view";
import { PracticeRuleCard } from "@/components/courses/rule-card";
import {
  FocusAnswer,
  FocusFooter,
  FocusHead,
  FocusPrompt,
  FocusShell,
  FocusTopBar,
  LinearProgress,
} from "@/components/layout/focus-shell";
import { AnswerFeedback } from "@/components/slova/answer-feedback";
import { Eyebrow } from "@/components/slova/eyebrow";
import { KeyHints } from "@/components/slova/key-hints";
import { ProgressSteps } from "@/components/slova/progress-steps";
import { Button } from "@/components/ui/button";
import {
  dealLessonPractice,
  isTestLesson,
  lessonPool,
  practiceSessionSize,
} from "@/lib/courses/practice";
import { cn } from "@/lib/utils";
import { useStudySitting } from "@/hooks/use-study-sitting";

type View = "lesson" | "practice" | "done";

export function LessonSession({
  courseSlug,
  courseTitle,
  lesson,
  rules,
  lessonIndex,
  lessonCount,
}: {
  courseSlug: string;
  courseTitle: string;
  lesson: Lesson;
  rules: Rule[];
  /** Zero-based. */
  lessonIndex: number;
  lessonCount: number;
}) {
  const t = useTranslations("courses");
  const common = useTranslations("common");
  const practiceT = useTranslations("practice");
  const theory = lesson.blocks.filter(isTheoryBlock);
  const pool = lessonPool(lesson);
  const sittingSize = practiceSessionSize(lesson.slug, pool.length);
  const hasTheory = theory.length > 0;
  const courseHref = `/courses/grammar/${courseSlug}`;

  const [view, setView] = useState<View>(hasTheory ? "lesson" : "practice");
  const [exercises, setExercises] = useState<Exercise[]>(() =>
    hasTheory
      ? []
      : dealLessonPractice(pool, { take: sittingSize, rng: Math.random }),
  );
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GrammarAnswered | null>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState(0);
  const [missedRuleIds, setMissedRuleIds] = useState<string[]>([]);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleAuto, setRuleAuto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sittingGen, setSittingGen] = useState(0);

  function startPractice() {
    setExercises(
      dealLessonPractice(pool, { take: sittingSize, rng: Math.random }),
    );
    setIndex(0);
    setResult(null);
    setRight(0);
    setMissed(0);
    setMissedRuleIds([]);
    setRuleOpen(false);
    setRuleAuto(false);
    setSittingGen((n) => n + 1);
    setView("practice");
  }

  function resumeOrStart() {
    if (exercises.length > 0 && index < exercises.length) {
      setView("practice");
      return;
    }
    startPractice();
  }

  const current = exercises[index];
  const rule = current
    ? rules.find((item) => item.id === current.ruleId)
    : undefined;

  const practiceOpen =
    exercises.length > 0 &&
    (view === "practice" || view === "done" || view === "lesson");

  const { getIdAsync, touch, flush, complete } = useStudySitting({
    active: practiceOpen,
    resetKey: sittingGen,
    kind: "grammar",
    label: `${courseSlug}/${lesson.slug}`,
    sourceState: "all",
    cardKey: current?.id ?? null,
  });

  function answer(given: GrammarAnswered) {
    if (!current || result) return;
    setResult(given);
    void touch({ rating: given.verdict === "correct" ? "good" : "again" });
    if (given.verdict === "correct") {
      setRight((count) => count + 1);
      setRuleAuto(false);
    } else {
      setMissed((count) => count + 1);
      setMissedRuleIds((ids) =>
        ids.includes(current.ruleId) ? ids : [...ids, current.ruleId],
      );
      setRuleOpen(true);
      setRuleAuto(true);
    }
  }

  const next = useCallback(async () => {
    if (!current || !result || saving) return;
    const nextIndex = index + 1;
    setResult(null);
    setRuleOpen(false);
    setRuleAuto(false);
    if (nextIndex >= exercises.length) {
      setSaving(true);
      await flush();
      const sittingId = await getIdAsync();
      await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug,
          lessonSlug: lesson.slug,
          right,
          missedRuleIds,
          sittingId: sittingId ?? undefined,
        }),
      }).catch(() => {});
      await complete({ missedRuleIds });
      setSaving(false);
      setView("done");
      return;
    }
    setIndex(nextIndex);
  }, [
    current,
    result,
    saving,
    index,
    exercises.length,
    courseSlug,
    lesson.slug,
    right,
    missedRuleIds,
    getIdAsync,
    flush,
    complete,
  ]);

  const enterLock = useRef(false);

  useEffect(() => {
    if (view !== "practice") return;

    function isField(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.repeat) return;
      const key = event.key.toLowerCase();

      if (key === "enter") {
        /*
         * Enter in the field is "check". The field then unmounts, and the
         * same keydown is retargeted at the window with the verdict already
         * in — that would also fire "next". Hold the key until keyup.
         */
        if (isField(event.target) || !result || saving) {
          enterLock.current = true;
          return;
        }
        if (enterLock.current) return;
        enterLock.current = true;
        event.preventDefault();
        void next();
        return;
      }

      if (isField(event.target)) return;
      if (key === "r" || key === "к") {
        event.preventDefault();
        setRuleAuto(false);
        setRuleOpen((open) => !open);
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "Enter") enterLock.current = false;
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [view, result, saving, next]);

  if (view === "lesson") {
    return (
      <LessonChrome
        topBar={
          <FocusTopBar
            leading={
              <Button variant="ghost" size="sm" render={<Link href={courseHref} />}>
                <ChevronLeft />
                <span lang="en">{courseTitle}</span>
              </Button>
            }
            progress={
              <ProgressSteps
                total={lessonCount}
                current={lessonIndex}
                label={t("lessonOf", {
                  current: lessonIndex + 1,
                  total: lessonCount,
                })}
              />
            }
            trailing={
              <span className="text-muted-foreground text-caption tabular-nums">
                {t("lessonBarMeta", {
                  current: lessonIndex + 1,
                  total: lessonCount,
                  minutes: lesson.estMinutes ?? 4,
                })}
              </span>
            }
          />
        }
        footer={
          <>
            <Button variant="outline" size="lg" render={<Link href={courseHref} />}>
              {t("backToLessons")}
            </Button>
            <Button size="lg" onClick={resumeOrStart} disabled={pool.length === 0}>
              {exercises.length > 0 && index < exercises.length
                ? t("continuePractice")
                : isTestLesson(lesson.slug)
                  ? t("startTestCount", { count: sittingSize })
                  : t("startPracticeCount", { count: sittingSize })}
            </Button>
          </>
        }
      >
        <Eyebrow>
          <span lang="en">{courseTitle}</span>
        </Eyebrow>
        <h1 className="text-display" lang="en">
          {lesson.title}
        </h1>
        <p className="text-muted-foreground text-lead mt-1.5">{lesson.titleRu}</p>
        {theory.length > 0 ? <TheoryView blocks={theory} /> : null}
      </LessonChrome>
    );
  }

  if (view === "done") {
    return (
      <FocusShell
        topBar={
          <FocusTopBar
            leading={
              <Button variant="ghost" size="sm" render={<Link href={courseHref} />}>
                <ChevronLeft />
                {t("backToLessons")}
              </Button>
            }
          />
        }
      >
        <LessonSummary
          right={right}
          total={exercises.length}
          onRestart={startPractice}
          courseHref={courseHref}
        />
      </FocusShell>
    );
  }

  if (!current) {
    return (
      <FocusShell
        topBar={
          <FocusTopBar
            leading={
              <Button variant="ghost" size="sm" render={<Link href={courseHref} />}>
                <ChevronLeft />
                {t("backToLessons")}
              </Button>
            }
          />
        }
      >
        <p className="text-muted-foreground text-center">{t("noExercises")}</p>
      </FocusShell>
    );
  }

  const optionCount =
    "options" in current ? current.options.length : 0;
  /*
   * R is only offered where it can be pressed. A written format focuses its
   * field, and a letter typed into a field is a letter, not a shortcut — so
   * advertising the key there promises something that only spells "r" into
   * the answer. Those formats open the rule by clicking it.
   */
  const hints = result
    ? [{ keys: [practiceT("keyEnter")], label: practiceT("hintNext") }]
    : optionCount > 0
      ? [
          {
            keys: ["1", String(optionCount)],
            label: practiceT("hintPick"),
          },
          { keys: ["R"], label: t("hintRule") },
        ]
      : [{ keys: [practiceT("keyEnter")], label: practiceT("hintCheck") }];

  return (
    <FocusShell
      align="start"
      topBar={
        <FocusTopBar
          leading={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasTheory) setView("lesson");
              }}
              render={hasTheory ? undefined : <Link href={courseHref} />}
            >
              <ChevronLeft />
              {hasTheory ? t("backToLesson") : t("backToLessons")}
            </Button>
          }
          progress={
            <LinearProgress
              current={index + 1}
              total={exercises.length}
              label={practiceT("progressOf", {
                current: index + 1,
                total: exercises.length,
              })}
            />
          }
          trailing={
            <>
              <span className="text-success text-caption tabular-nums">
                {practiceT("rightN", { count: right })}
              </span>
              <span className="text-destructive text-caption tabular-nums">
                {practiceT("missedN", { count: missed })}
              </span>
            </>
          }
        />
      }
    >
      <FocusHead
        task={
          current.kind === "pick-sentence" || current.kind === "transform"
            ? current.prompt
            : t(taskKey(current))
        }
      />

      <FocusPrompt compact>
        <GrammarQuestion
          exercise={current}
          answered={result}
          onAnswered={answer}
          part="prompt"
        />
      </FocusPrompt>

      <FocusAnswer compact>
        <GrammarQuestion
          key={current.id}
          exercise={current}
          answered={result}
          onAnswered={answer}
          part="answer"
        />
      </FocusAnswer>

      <FocusFooter>
        <AnswerFeedback
          verdict={
            result === null
              ? null
              : result.verdict === "correct"
                ? "correct"
                : "incorrect"
          }
          answer={result && result.verdict !== "correct" ? current.answer : undefined}
          className="min-w-0 flex-1"
        />
        <Button
          size="lg"
          onClick={() => void next()}
          className={result === null ? "invisible" : undefined}
        >
          {common("next")}
        </Button>
      </FocusFooter>

      <PracticeRuleCard
        open={ruleOpen}
        auto={ruleAuto}
        courseTitle={courseTitle}
        lessonTitle={lesson.title}
        card={lesson.ruleCard}
        rule={rule}
        markedRuleId={result?.verdict === "wrong" ? current.ruleId : null}
        onToggle={() => {
          setRuleAuto(false);
          setRuleOpen((open) => !open);
        }}
        onOpenLesson={hasTheory ? () => setView("lesson") : undefined}
      />

      <KeyHints className="mt-3.5 justify-center" hints={hints} />
    </FocusShell>
  );
}

/**
 * Lesson reading chrome: the same top bar as a session, a prose column, and
 * a pinned footer. Scroll stays on the app inset — a nested scroller here
 * never got a height (the padding wrapper has no min-h-0) and the page
 * clipped instead.
 *
 * The footer sticks rather than being `fixed`: the sidebar is `collapsible`,
 * so a fixed bar can only guess its left edge, and `--sidebar-width` is the
 * wrong guess for all of the collapsed state, the icon rail and the mobile
 * Sheet. Sticking inside the inset makes the width fall out of the layout,
 * and the column still keeps its height so a short lesson pins the bar to
 * the bottom of the screen rather than floating it mid-page.
 */
function LessonChrome({
  topBar,
  footer,
  children,
}: {
  topBar: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="-mx-(--page-px) -mt-(--page-pt) -mb-(--page-pb) flex flex-1 flex-col">
      {topBar}
      <div className="flex-1 px-5 pt-11 pb-14 md:px-8">
        <div className="container-prose w-full">{children}</div>
      </div>
      <div
        className={cn(
          "scrim-panel border-border sticky bottom-0 z-30 border-t px-5 py-3.5 md:px-8",
          "pb-[max(0.875rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="container-prose flex items-center justify-between gap-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

function LessonSummary({
  right,
  total,
  onRestart,
  courseHref,
}: {
  right: number;
  total: number;
  onRestart: () => void;
  courseHref: string;
}) {
  const t = useTranslations("courses");
  const practiceT = useTranslations("practice");
  const missed = total - right;

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Eyebrow>{t("thisLesson")}</Eyebrow>
      <h2 className="text-h1 mt-2">
        {missed === 0 ? t("everyRight") : t("tryAgain")}
      </h2>
      <p className="text-muted-foreground mt-3">
        {practiceT("progressOf", { current: right, total })}
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" size="lg" onClick={onRestart}>
          {practiceT("restart")}
        </Button>
        <Button variant="outline" size="lg" render={<Link href={courseHref} />}>
          {t("backToLessons")}
        </Button>
      </div>
    </div>
  );
}
