"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

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
import { MutationStatus } from "@/components/slova/mutation-status";
import { Button } from "@/components/ui/button";
import type { GrammarReviewItem } from "@/lib/courses/review";
import { useReliableMutations } from "@/hooks/use-reliable-mutations";
import { useStudySitting } from "@/hooks/use-study-sitting";

const GRAMMAR_HREF = "/courses/grammar";

/**
 * One Grammar Review sitting: one fresh prompt for each rule that is due.
 *
 * Deliberately not a shared player with `LessonSession`. The two orchestrate
 * different things — a lesson deals from a pool and saves one result at the
 * end, a review answers per rule and persists each answer on its own — and
 * duplicated state is cheaper to keep honest than an abstraction invented
 * before either implementation has asked for it twice. The leaf components,
 * which is where the keyboard and the geometry live, are shared.
 */
export function GrammarReviewSession({ items }: { items: GrammarReviewItem[] }) {
  const t = useTranslations("grammarReview");
  const courses = useTranslations("courses");
  const common = useTranslations("common");
  const practiceT = useTranslations("practice");

  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GrammarAnswered | null>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState(0);
  const [missedRuleIds, setMissedRuleIds] = useState<string[]>([]);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleAuto, setRuleAuto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const {
    submit,
    flush: flushMutations,
    retryFailed,
    phase: mutationPhase,
    online,
    failedCount,
  } = useReliableMutations();

  const current = items[index];
  const { getIdAsync, elapsedMs, track, flush, complete } =
    useStudySitting({
      active: items.length > 0,
      kind: "grammar",
      label: "review",
      sourceState: "all",
      setIds: [],
      cardKey: current?.exercise.id ?? null,
    });

  function answer(given: GrammarAnswered) {
    if (!current || result) return;
    const correct = given.verdict === "correct";
    setResult(given);

    if (correct) {
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

    /*
     * The sitting counters are the server's job here, not the client's.
     * A lesson calls `touch({ rating })` because its own mutation counts
     * nothing per answer; `persistGrammarReview` counts inside its
     * serializable transaction, exactly as a vocabulary review does. Doing
     * both would double every review and race the two writers on one row.
     */
    const operationId = crypto.randomUUID();
    const spent = elapsedMs();
    void track(
      submit({
        id: operationId,
        endpoint: "/api/courses/review",
        // Lazily, so the sitting id can still be arriving when the answer is
        // given: the network round trip must never gate the Next button.
        body: async () => ({
          memoryId: current.memoryId,
          courseSlug: current.courseSlug,
          ruleId: current.ruleId,
          exerciseId: current.exercise.id,
          operationId,
          correct,
          elapsedMs: spent,
          sittingId: (await getIdAsync()) ?? undefined,
        }),
      }),
    );
  }

  const next = useCallback(async () => {
    if (!current || !result || saving) return;
    const nextIndex = index + 1;
    setResult(null);
    setRuleOpen(false);
    setRuleAuto(false);

    if (nextIndex >= items.length) {
      setSaving(true);
      // Everything answered must have reached the server, or be visibly
      // waiting to, before the sitting says what it did.
      await flushMutations();
      await flush();
      await complete({
        score: Math.round((100 * right) / Math.max(1, items.length)),
        missedRuleIds,
      });
      setSaving(false);
      setDone(true);
      return;
    }
    setIndex(nextIndex);
  }, [
    current,
    result,
    saving,
    index,
    items.length,
    right,
    missedRuleIds,
    flushMutations,
    flush,
    complete,
  ]);

  /*
   * After an answer the way on takes focus, as vocabulary practice asks for:
   * the option just chosen is no longer actionable, and a keyboard learner
   * should not have to hunt for Next. The rule panel opens itself on a miss
   * and deliberately does not take focus with it — the explanation is an
   * offer, not an interruption.
   *
   * Known limitation, shared with `practice-session.tsx`: this `focus()` does
   * not currently take. Right after the re-render the Base UI `Button`
   * refuses programmatic focus — a plain <button> in the same position at the
   * same moment accepts it, and the same call succeeds a second later. The
   * fix belongs in `components/ui/button.tsx`, not here; when it lands both
   * sessions get the behaviour with no change.
   */
  useEffect(() => {
    if (result === null) return;
    const frame = requestAnimationFrame(() => {
      nextButtonRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [result]);

  const enterLock = useRef(false);

  useEffect(() => {
    if (done || !current) return;

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
        // Same hold as lesson practice: Enter checks in the field, and the
        // very same keydown would otherwise also press Next once the field
        // unmounts.
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
  }, [done, current, result, saving, next]);

  if (done || !current) {
    return (
      <FocusShell topBar={<ReviewTopBar />}>
        <MutationStatus
          phase={mutationPhase}
          failedCount={failedCount}
          online={online}
          onRetry={() => void retryFailed()}
        />
        <ReviewSummary right={right} total={items.length} missed={missed} />
      </FocusShell>
    );
  }

  const optionCount = "options" in current.exercise
    ? current.exercise.options.length
    : 0;
  const hints = result
    ? [{ keys: [practiceT("keyEnter")], label: practiceT("hintNext") }]
    : optionCount > 0
      ? [
          { keys: ["1", String(optionCount)], label: practiceT("hintPick") },
          { keys: ["R"], label: courses("hintRule") },
        ]
      : [{ keys: [practiceT("keyEnter")], label: practiceT("hintCheck") }];

  return (
    <FocusShell
      align="start"
      topBar={
        <ReviewTopBar
          progress={
            <LinearProgress
              current={index + 1}
              total={items.length}
              label={t("progressLabel", {
                current: index + 1,
                total: items.length,
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
      head={
        <FocusHead
          task={
            current.exercise.kind === "pick-sentence" ||
            current.exercise.kind === "transform"
              ? current.exercise.prompt
              : courses(taskKey(current.exercise))
          }
        />
      }
      prompt={
        <FocusPrompt compact>
          <GrammarQuestion
            exercise={current.exercise}
            answered={result}
            onAnswered={answer}
            part="prompt"
          />
        </FocusPrompt>
      }
    >
      <MutationStatus
        phase={mutationPhase}
        failedCount={failedCount}
        online={online}
        onRetry={() => void retryFailed()}
      />

      <FocusAnswer compact>
        <GrammarQuestion
          key={current.exercise.id}
          exercise={current.exercise}
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
          answer={
            result && result.verdict !== "correct"
              ? current.exercise.answer
              : undefined
          }
          className="min-w-0 flex-1"
        />
        <Button
          ref={nextButtonRef}
          size="lg"
          onClick={() => void next()}
          disabled={saving}
          className={result === null ? "invisible" : undefined}
        >
          {common("next")}
        </Button>
      </FocusFooter>

      <PracticeRuleCard
        open={ruleOpen}
        auto={ruleAuto}
        courseTitle={current.courseTitle}
        lessonTitle={current.lessonTitle}
        card={undefined}
        rule={{
          id: current.ruleId,
          title: current.ruleTitle,
          anchorMd: current.ruleAnchorMd,
        }}
        markedRuleId={result?.verdict === "wrong" ? current.ruleId : null}
        onToggle={() => {
          setRuleAuto(false);
          setRuleOpen((open) => !open);
        }}
        lessonHref={
          current.lessonSlug
            ? `${GRAMMAR_HREF}/${current.courseSlug}/${current.lessonSlug}`
            : undefined
        }
      />

      <KeyHints className="mt-3.5 justify-center" hints={hints} />
    </FocusShell>
  );
}

function ReviewTopBar({
  progress,
  trailing,
}: {
  progress?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const t = useTranslations("grammarReview");

  return (
    <FocusTopBar
      leading={
        <Button variant="ghost" size="sm" render={<Link href={GRAMMAR_HREF} />}>
          <ChevronLeft />
          {t("backToGrammar")}
        </Button>
      }
      progress={progress}
      trailing={trailing}
    />
  );
}

/**
 * No "again" button.
 *
 * Rules answered correctly are no longer due, and the ones missed are meant
 * to wait until tomorrow. Repeating the same prompts now would turn review
 * into memorising this sitting.
 */
function ReviewSummary({
  right,
  total,
  missed,
}: {
  right: number;
  total: number;
  missed: number;
}) {
  const t = useTranslations("grammarReview");
  const practiceT = useTranslations("practice");

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Eyebrow>{t("title")}</Eyebrow>
      <h2 className="text-h1 mt-2">
        {missed === 0 ? t("summaryAllRight") : t("summaryMissed")}
      </h2>
      <p className="text-muted-foreground mt-3">
        {practiceT("progressOf", { current: right, total })}
      </p>
      {missed > 0 ? (
        <p className="text-muted-foreground mt-1.5 text-body-sm">
          {t("missedReturnTomorrow")}
        </p>
      ) : null}
      <div className="mt-9">
        <Button size="lg" render={<Link href={GRAMMAR_HREF} />}>
          {t("backToGrammar")}
        </Button>
      </div>
    </div>
  );
}
