"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, LoaderCircle } from "lucide-react";

import type { Annotation } from "@/content/stories/schema";
import {
  GrammarQuestion,
  taskKey,
  type GrammarAnswered,
} from "@/components/courses/exercise-view";
import {
  FocusAnswer,
  FocusFooter,
  FocusHead,
  FocusPrompt,
  FocusTopBar,
} from "@/components/layout/focus-shell";
import { AnswerFeedback } from "@/components/slova/answer-feedback";
import { useViewportInset } from "@/hooks/use-viewport-inset";
import { PageBack } from "@/components/page-back";
import { ProgressSteps } from "@/components/slova/progress-steps";
import { SpeakButton } from "@/components/slova/speak-button";
import { Token } from "@/components/slova/token";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeKey } from "@/lib/lexicon/key";
import type { LoadedStory } from "@/lib/stories/load";
import type { DictionaryWord } from "@/lib/stories/select";
import {
  buildParagraphSegments,
  dictionaryStateOf,
} from "@/lib/stories/reader-view";
import { cn } from "@/lib/utils";

type Phase = "reading" | "questions" | "summary";

/**
 * The three-phase story experience — docs/plans/stories.md §6.3-6.5. All
 * grading is local (§3.4, like courses); each answer and the completion are
 * then posted to /api/stories/[slug]/progress best-effort — a failed save
 * never blocks the session, since this screen's value is the reading and
 * the questions, not the row about them. Reading again after completion
 * does not reset the quiz; it only shows the text again (3.4: no re-read
 * control until completion, and even then it is read-only). Revisiting an
 * already-completed story opens straight to the summary, since a completed
 * row cannot be re-answered.
 */
export function StoryReader({
  story,
  dictionary: initialDictionary,
  initialProgress,
}: {
  story: LoadedStory;
  dictionary: Record<string, DictionaryWord>;
  initialProgress: { correctCount: number } | null;
}) {
  const t = useTranslations("stories");
  const coursesT = useTranslations("courses");
  const common = useTranslations("common");

  const { keyboard } = useViewportInset();
  const [phase, setPhase] = useState<Phase>(
    initialProgress ? "summary" : "reading",
  );
  const [completed, setCompleted] = useState(initialProgress !== null);
  const [dictionary, setDictionary] = useState(initialDictionary);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<GrammarAnswered | null>(null);
  const [right, setRight] = useState(initialProgress?.correctCount ?? 0);

  const focusLemmaCount = story.annotations.filter(
    (a) => a.role === "focus",
  ).length;

  async function postProgress(body: Record<string, unknown>) {
    try {
      await fetch(`/api/stories/${story.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Best-effort: the session's own state is what the UI shows either way.
    }
  }

  function handleWordAdded(annotation: Annotation, word: DictionaryWord) {
    setDictionary((prev) => ({ ...prev, [normalizeKey(annotation.lemma)]: word }));
    setJustAdded((prev) => new Set(prev).add(annotation.id));
  }

  function answerQuestion(result: GrammarAnswered) {
    setAnswered(result);
    if (result.verdict === "correct") setRight((count) => count + 1);
    void postProgress({
      action: "answer",
      questionId: story.questions[index]!.id,
      answer: result.given,
      correct: result.verdict === "correct",
    });
  }

  function nextQuestion() {
    if (!answered) return;
    if (index + 1 >= story.questions.length) {
      setCompleted(true);
      setPhase("summary");
      void postProgress({ action: "complete" });
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
  }

  if (phase === "questions") {
    const current = story.questions[index]!;
    return (
      <div
        key="questions"
        className="story-phase-enter -mx-(--page-px) -mt-(--page-pt) -mb-(--page-pb) flex flex-1 flex-col"
      >
        <FocusTopBar
          leading={
            <Button variant="ghost" size="sm" render={<Link href="/stories" />}>
              <ChevronLeft />
              {t("backToStories")}
            </Button>
          }
          progress={
            <ProgressSteps
              total={story.questions.length}
              current={index}
              label={t("questionOf", {
                current: index + 1,
                total: story.questions.length,
              })}
            />
          }
        />
        <div className="flex flex-1 justify-center px-4 pt-11 pb-10 md:px-8">
          <div className="container-prose w-full">
            {/* One sticky container, not two — see FocusShell. */}
            <div
              className={cn(
                keyboard && "bg-background sticky top-(--focus-topbar-h) z-10",
              )}
            >
              <FocusHead task={coursesT(taskKey(current))} />
              <FocusPrompt compact>
                <GrammarQuestion
                  exercise={current}
                  answered={answered}
                  onAnswered={answerQuestion}
                  part="prompt"
                />
              </FocusPrompt>
            </div>
            <FocusAnswer compact>
              <GrammarQuestion
                key={current.id}
                exercise={current}
                answered={answered}
                onAnswered={answerQuestion}
                part="answer"
              />
            </FocusAnswer>
            <FocusFooter>
              <AnswerFeedback
                verdict={
                  answered === null
                    ? null
                    : answered.verdict === "correct"
                      ? "correct"
                      : "incorrect"
                }
                answer={
                  answered && answered.verdict !== "correct"
                    ? current.answer
                    : undefined
                }
                className="min-w-0 flex-1"
              />
              <Button
                size="lg"
                onClick={nextQuestion}
                className={answered === null ? "invisible" : undefined}
              >
                {common("next")}
              </Button>
            </FocusFooter>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div key="summary" className="story-phase-enter">
        <div className="flex flex-col items-center py-14 text-center">
          <h2 className="text-h2">{t("summaryTitle")}</h2>
          <p className="text-muted-foreground mt-2.5 max-w-sm">
            {t("summaryCaption")}
          </p>

          <dl className="mt-8 flex flex-col items-center gap-6 min-[390px]:flex-row min-[390px]:gap-9">
            <Fact
              value={t("factQuestionsValue", {
                right,
                total: story.questions.length,
              })}
              label={t("factQuestions")}
            />
            <Fact value={String(focusLemmaCount)} label={t("factWordsInContext")} />
            <Fact value={String(justAdded.size)} label={t("factAdded")} />
          </dl>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/practice" />}>
              {t("trainWords")}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setPhase("reading")}>
              {t("readAgain")}
            </Button>
            <Button variant="link" size="lg" render={<Link href="/stories" />}>
              {t("backToStories")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key="reading"
      className="story-phase-enter -mx-(--page-px) -mt-(--page-pt) -mb-(--page-pb) flex flex-1 flex-col"
    >
      <div className="flex-1 px-5 pt-11 pb-14 md:px-8">
        <div className="container-prose w-full">
          <PageBack href="/stories" label={t("backToStories")} />
          <h2 className="text-h2 mt-6" lang="en">
            {story.title}
          </h2>
          <p className="text-muted-foreground mt-1.5 text-caption">
            {[
              story.level,
              t("minutesShort", { minutes: story.estimatedMinutes }),
              t("tapHint"),
            ].join(" · ")}
          </p>

          <div className="mt-8 space-y-3.5">
            {story.paragraphs.map((paragraph) => (
              <p key={paragraph.id} className="text-story max-w-[68ch]">
                {buildParagraphSegments(paragraph, story.annotations).map(
                  (segment, i) =>
                    segment.kind === "text" ? (
                      <span key={i}>{segment.text}</span>
                    ) : (
                      <AnnotationSpan
                        key={segment.annotation.id}
                        text={segment.text}
                        annotation={segment.annotation}
                        record={dictionary[normalizeKey(segment.annotation.lemma)]}
                        justAdded={justAdded.has(segment.annotation.id)}
                        slug={story.slug}
                        onAdded={handleWordAdded}
                      />
                    ),
                )}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="scrim-panel sticky bottom-0 z-30 border-t border-border px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:px-8">
        <div className="container-prose flex items-center justify-end gap-4">
          <Button
            size="lg"
            onClick={() => setPhase(completed ? "summary" : "questions")}
          >
            {completed ? t("backToSummary") : t("answerQuestions")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="text-h3 font-display leading-none tabular-nums">{value}</dd>
      <dt className="text-muted-foreground mt-1.5 text-caption">{label}</dt>
    </div>
  );
}

function AnnotationSpan({
  text,
  annotation,
  record,
  justAdded,
  slug,
  onAdded,
}: {
  text: string;
  annotation: Annotation;
  record: DictionaryWord | undefined;
  justAdded: boolean;
  slug: string;
  onAdded: (annotation: Annotation, word: DictionaryWord) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "-my-0.5 touch-manipulation py-0.5 underline decoration-2 decoration-data-learning underline-offset-[3px]",
              "[text-decoration-skip-ink:auto]",
            )}
          />
        }
      >
        {text}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[300px]">
        <GlossContent
          annotation={annotation}
          record={record}
          justAdded={justAdded}
          slug={slug}
          onAdded={onAdded}
        />
      </PopoverContent>
    </Popover>
  );
}

function GlossContent({
  annotation,
  record,
  justAdded,
  slug,
  onAdded,
}: {
  annotation: Annotation;
  record: DictionaryWord | undefined;
  justAdded: boolean;
  slug: string;
  onAdded: (annotation: Annotation, word: DictionaryWord) => void;
}) {
  const t = useTranslations("stories");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const state = dictionaryStateOf(record);
  const showsBaseForm =
    annotation.lemma.toLowerCase() !== annotation.surface.toLowerCase();

  async function add() {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/stories/${slug}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotationId: annotation.id }),
      });
      if (!response.ok) throw new Error("request failed");
      const { word } = (await response.json()) as {
        word: { introducedAt: string | null; intervalDays: number } | null;
      };
      if (!word) throw new Error("no word returned");
      onAdded(annotation, {
        key: normalizeKey(annotation.lemma),
        introducedAt: word.introducedAt === null ? null : new Date(word.introducedAt),
        intervalDays: word.intervalDays,
      });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-1">
      <p className="text-h4" lang="en">
        {annotation.surface}
        {showsBaseForm ? (
          <>
            <span className="mx-1.5 text-muted-foreground text-body-sm">→</span>
            <Token>{annotation.lemma}</Token>
          </>
        ) : null}
      </p>
      <SpeakButton text={annotation.surface} />

      <p className="text-body-sm text-foreground">{annotation.glossRu}</p>

      <p className="text-caption text-muted-foreground">
        {state === "known"
          ? t("dictionaryKnown")
          : state === "learning"
            ? t("dictionaryLearning")
            : t("dictionaryAbsent")}
      </p>

      {state === "absent" ? (
        <>
          <Button size="sm" className="w-full" onClick={() => void add()} disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {t("addWord")}
          </Button>
          {failed ? (
            <p className="text-caption text-destructive">{t("addWordFailed")}</p>
          ) : null}
        </>
      ) : justAdded ? (
        <p className="text-caption text-muted-foreground">{t("wordAdded")}</p>
      ) : null}
    </div>
  );
}
