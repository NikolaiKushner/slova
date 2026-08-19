import { RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import { NAV_SECTIONS, type NavItem } from "@/lib/nav";
import type { MarketingStoryStill } from "@/lib/stories/marketing";
import { cn } from "@/lib/utils";

/**
 * A still of the app, for the public pages. It is markup, not a screenshot:
 * it uses the same tokens as the real shell so it cannot drift into a
 * different product. Decorative — pointer-events off, hidden from AT.
 *
 * `window` is the whole shell (sidebar included) — once, in the hero.
 * `panel` crops to the content column so later stills can be larger.
 *
 * The sidebar reads `NAV_SECTIONS`, the same list the real one does. Shared
 * tokens were not enough: the mockup kept its own sections and advertised a
 * Today screen for months after the route was removed. There is one navigation
 * model, and a still that disagrees with it will not compile.
 */
export function ProductFrame({
  children,
  className,
  compact = false,
  activeHref = "/practice",
  chrome = "window",
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  activeHref?: NavItem["href"];
  chrome?: "window" | "panel";
}) {
  const t = useTranslations("nav");
  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden rounded-xl border border-border-subtle bg-card shadow-lifted select-none",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-1.5 border-b border-border-subtle bg-card px-3.5 py-2.5">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <BrandWordmark className="ml-1.5 text-sm" />
      </div>
      <div className="flex bg-card">
        {chrome === "window" ? (
          <aside className="hidden w-[150px] shrink-0 border-r border-border-subtle bg-card p-2.5 sm:block">
            {NAV_SECTIONS.map((section) => (
              <section key={section.titleKey} className="mt-3 first:mt-0">
                <p className="text-overline text-muted-foreground px-2">
                  {t(section.titleKey)}
                </p>
                {section.items.map((item) => (
                  <p
                    key={item.href}
                    className={cn(
                      "rounded-sm px-2 py-1 text-sm",
                      item.href === activeHref
                        ? "bg-secondary font-medium text-foreground"
                        : "text-foreground/80",
                    )}
                  >
                    {t(item.titleKey)}
                  </p>
                ))}
              </section>
            ))}
          </aside>
        ) : null}
        <div
          className={cn(
            "min-w-0 flex-1",
            compact ? "px-5 py-5" : "px-6 py-6",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * A cropped fragment — no window chrome, so three can sit in a row. The label
 * says which training it is, because three questions with no names read as one
 * screen shown three times.
 */
export function ProductPanel({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden rounded-lg border border-border-subtle bg-card shadow-card select-none",
        className,
      )}
      aria-hidden
    >
      <div className="px-4 py-4">
        {label ? (
          <p className="text-overline text-muted-foreground mb-3">{label}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/**
 * The top of the real Trainings page, which is where signing in lands you.
 *
 * Not an embedded `PracticePage`: that one is a client component that fetches
 * counts and navigates. This is the same information in the same order, with
 * the numbers left out — an anonymous visitor has no due words, and inventing
 * "12 due" would be the same fiction the Today still used to tell.
 */
export function TrainingsOverviewStill() {
  const t = useTranslations("practice");
  const trainings = useTranslations("trainings");

  return (
    <div>
      <p className="text-overline text-muted-foreground">{t("eyebrow")}</p>
      <p className="text-h2 mt-2">{t("title")}</p>

      {/* The real bar carries a Change control; a still that cannot be changed
          should not draw one. What it is studying is the part that matters. */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg border border-border bg-card px-3.5 py-2.5">
        <span className="text-caption text-muted-foreground">{t("studying")}</span>
        <span className="text-sm font-medium">{t("state_due")}</span>
      </div>

      <p className="text-overline text-muted-foreground mt-5">{t("startHere")}</p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <StillModeCard
          icon={RotateCcw}
          title={t("reviewTitle")}
          action={t("reviewAction")}
          primary
        />
        <StillModeCard
          icon={Sparkles}
          title={trainings("brainstorm.title")}
          action={t("brainstormAction")}
        />
      </div>
    </div>
  );
}

function StillModeCard({
  icon: Icon,
  title,
  action,
  primary = false,
}: {
  icon: typeof RotateCcw;
  title: string;
  action: string;
  primary?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-3">
      <span className="bg-accent text-accent-foreground mb-2.5 flex size-7 items-center justify-center rounded-[8px]">
        <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
      </span>
      <p className="text-h4">{title}</p>
      <span
        className={cn(
          "mt-3 inline-flex min-h-8 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap",
          primary
            ? "bg-primary text-primary-foreground"
            : "border border-border text-foreground/80",
        )}
      >
        {action}
      </span>
    </div>
  );
}

/**
 * One reading state from a real story — the interaction that explains why the
 * stories exist. Content comes from `loadMarketingStoryStill()`; nothing here
 * writes English or a translation of its own.
 *
 * The live `Popover`, `SpeakButton` and add-to-dictionary action are
 * deliberately not reused: they are client behaviour, and on a frame that is
 * `aria-hidden` with pointer events off they would look like controls that do
 * nothing. The gloss is a static card with the same tokens, sitting in flow so
 * it cannot escape the frame on a narrow screen.
 */
export function StoryReaderStill({ story }: { story: MarketingStoryStill }) {
  const t = useTranslations("stories");

  return (
    <div>
      <p className="text-h3" lang="en">
        {story.title}
      </p>
      <p className="text-caption mt-1.5 text-muted-foreground">
        {[story.level, t("minutesShort", { minutes: story.estimatedMinutes })].join(
          " · ",
        )}
      </p>

      <p className="text-story mt-4" lang="en">
        {story.segments.map((segment, i) =>
          segment.kind === "text" ? (
            <span key={i}>{segment.text}</span>
          ) : (
            <span
              key={i}
              className="underline decoration-2 decoration-data-learning underline-offset-[3px] [text-decoration-skip-ink:auto]"
            >
              {segment.text}
            </span>
          ),
        )}
      </p>

      <div className="shadow-pop mt-4 max-w-[300px] rounded-lg border border-border bg-popover p-3.5">
        <p className="text-h4" lang="en">
          {story.gloss.surface}
          {story.gloss.lemma.toLowerCase() !== story.gloss.surface.toLowerCase() ? (
            <>
              <span className="mx-1.5 text-muted-foreground text-body-sm">→</span>
              <span className="text-muted-foreground text-body-sm">
                {story.gloss.lemma}
              </span>
            </>
          ) : null}
        </p>
        <p className="text-body-sm mt-1.5 text-foreground">{story.gloss.glossRu}</p>
      </div>

      <div className="mt-4 flex justify-end border-t border-border-subtle pt-3.5">
        <span className="bg-primary text-primary-foreground inline-flex min-h-8 items-center rounded-md px-3.5 text-sm font-medium">
          {t("answerQuestions")}
        </span>
      </div>
    </div>
  );
}

const WORDS = [
  ["hello", "привет"],
  ["thanks", "спасибо"],
  ["because", "потому что"],
  ["although", "хотя"],
] as const;

export function DictionaryScreen() {
  const t = useTranslations("product");
  return (
    <div>
      <p className="text-overline text-muted-foreground">{t("myWords")}</p>
      <p className="text-h2 mt-2 mb-4">{t("addWords")}</p>
      <div className="overflow-hidden rounded-md border border-border-subtle">
        <div className="text-overline text-muted-foreground grid grid-cols-2">
          <p className="px-3.5 py-2">{t("english")}</p>
          <p className="border-l border-border-subtle px-3.5 py-2">
            {t("russian")}
          </p>
        </div>
        {WORDS.map(([en, ru]) => (
          <div
            key={en}
            className="grid grid-cols-2 border-t border-border-subtle text-sm"
          >
            <p className="px-3.5 py-2.5" lang="en">
              {en}
            </p>
            <p className="border-l border-border-subtle px-3.5 py-2.5">{ru}</p>
          </div>
        ))}
        <div className="text-muted-foreground grid grid-cols-2 border-t border-border-subtle text-sm">
          <p className="px-3.5 py-2.5">{t("typeOrPaste")}</p>
          <p className="border-l border-border-subtle px-3.5 py-2.5"> </p>
        </div>
      </div>
    </div>
  );
}

export function PracticeScreen() {
  const t = useTranslations("product");
  return (
    <div>
      <p className="text-overline text-muted-foreground">{t("word")}</p>
      <p className="text-h2 mt-2" lang="en">
        hello
      </p>
      <div className="mt-4 grid gap-1.5">
        {["привет", "пока", "спасибо", "пожалуйста"].map((option, i) => (
          <StillOption key={option} index={i + 1} picked={i === 0}>
            {option}
          </StillOption>
        ))}
      </div>
    </div>
  );
}

/** One option row, as the drill draws it. `picked` is the answer being given. */
function StillOption({
  children,
  index,
  picked = false,
}: {
  children: React.ReactNode;
  index?: number;
  picked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm",
        picked
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-subtle bg-card text-foreground/80",
      )}
    >
      {index === undefined ? null : (
        <span className="text-overline w-2.5 shrink-0 text-muted-foreground">
          {index}
        </span>
      )}
      {children}
    </div>
  );
}

export function PracticeChoiceStill() {
  return (
    <div>
      <p className="text-h3" lang="en">
        hello
      </p>
      <div className="mt-3 grid gap-1.5">
        {["привет", "пока", "спасибо"].map((option, i) => (
          <StillOption key={option} index={i + 1} picked={i === 0}>
            {option}
          </StillOption>
        ))}
      </div>
    </div>
  );
}

/** Bar heights for the waveform — a fixed pattern, not random, so it is stable. */
const WAVE = [7, 14, 20, 11, 17, 8, 13, 19, 9, 15, 6, 12];

export function PracticeAudioStill() {
  return (
    <div>
      <div className="flex items-center gap-2.5 py-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Volume2 className="size-3.5" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="flex h-6 items-center gap-[2.5px]">
          {WAVE.map((height, i) => (
            <span
              key={i}
              className="w-[2.5px] rounded-full bg-border"
              style={{ height }}
            />
          ))}
        </span>
      </div>
      <div className="mt-2.5 grid gap-1.5">
        {["although", "alone"].map((option, i) => (
          <StillOption key={option} index={i + 1} picked={i === 0}>
            <span lang="en">{option}</span>
          </StillOption>
        ))}
      </div>
    </div>
  );
}

export function PracticeTypingStill() {
  const t = useTranslations("product");
  return (
    <div>
      <p className="text-h3">потому что</p>
      <p className="mt-3 border-b-2 border-primary px-0.5 py-1.5 text-sm" lang="en">
        becau
        <span className="caret-blink ml-px inline-block h-[15px] w-px translate-y-[3px] bg-primary" />
      </p>
      <p className="text-caption mt-3 text-muted-foreground">{t("enterToCheck")}</p>
    </div>
  );
}

/** Same order as content/courses/present-simple/course.json. */
const LESSONS = [
  ["Forms", "Форма"],
  ["Use", "Употребление"],
  ["Spelling", "-s / -es / -ies"],
  ["Negatives", "Отрицание"],
  ["Questions", "Вопросы"],
  ["Test", "Проверка"],
] as const;

export function GrammarCourseStill() {
  const t = useTranslations("nav");
  return (
    <div>
      <p className="text-overline text-muted-foreground">{t("grammar")}</p>
      <p className="text-h2 mt-2" lang="en">
        Present Simple
      </p>
      <p className="text-caption mb-4 text-muted-foreground">
        Простое настоящее
      </p>
      <div className="grid gap-1.5">
        {LESSONS.map(([en, ru], index) => (
          <div
            key={en}
            className="flex items-baseline gap-3 rounded-md border border-border-subtle bg-card px-3.5 py-2.5 text-sm"
          >
            <span className="text-overline w-2.5 shrink-0 text-muted-foreground">
              {index + 1}
            </span>
            <span className="text-h4 min-w-0" lang="en">
              {en}
            </span>
            <span className="text-caption text-muted-foreground">{ru}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
