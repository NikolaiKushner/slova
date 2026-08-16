import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

/**
 * A still of the app, for the public pages. It is markup, not a screenshot:
 * it uses the same tokens as the real shell so it cannot drift into a
 * different product. Decorative — pointer-events off, hidden from AT.
 *
 * `window` is the whole shell (sidebar included) — once, in the hero.
 * `panel` crops to the content column so later stills can be larger.
 */
export function ProductFrame({
  children,
  className,
  compact = false,
  active = "today",
  chrome = "window",
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  active?: "today" | "courses";
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
            <p className="text-overline text-muted-foreground px-2">{t("tasks")}</p>
            <p
              className={cn(
                "rounded-sm px-2 py-1.5 text-sm",
                active === "today"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-foreground/80",
              )}
            >
              {t("today")}
            </p>
            <p className="text-overline text-muted-foreground mt-3 px-2">
              {t("practice")}
            </p>
            <p className="px-2 py-1.5 text-sm text-foreground/80">
              {t("trainings")}
            </p>
            <p className="text-overline text-muted-foreground mt-3 px-2">
              {t("courses")}
            </p>
            <p
              className={cn(
                "rounded-sm px-2 py-1.5 text-sm",
                active === "courses"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-foreground/80",
              )}
            >
              {t("grammar")}
            </p>
            <p className="text-overline text-muted-foreground mt-3 px-2">
              {t("dictionary")}
            </p>
            <p className="px-2 py-1.5 text-sm text-foreground/80">
              {t("myWords")}
            </p>
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

export function TodayScreen() {
  const t = useTranslations("product");
  return (
    <div>
      <p className="text-overline text-muted-foreground">{t("todayEyebrow")}</p>
      <p className="text-h2 mt-2">{t("todayTitle")}</p>
      <p className="text-caption mt-1.5 text-muted-foreground">{t("todayBody")}</p>
      <p className="text-overline text-muted-foreground mt-5">{t("yourWords")}</p>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-border">
        <span className="bg-data-learned h-full w-[35%]" />
        <span className="bg-data-learning h-full w-[40%]" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-data-learned size-1.5 rounded-full" />
          <span className="font-semibold">14</span>
          <span className="text-foreground/80">{t("learned")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-data-learning size-1.5 rounded-full" />
          <span className="font-semibold">16</span>
          <span className="text-foreground/80">{t("learning")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-data-untouched size-1.5 rounded-full" />
          <span className="font-semibold">10</span>
          <span className="text-foreground/80">{t("notStarted")}</span>
        </span>
      </div>
      <span className="bg-primary text-primary-foreground mt-5 inline-flex min-h-10 items-center rounded-md px-5 text-sm font-medium">
        {t("studyNow")}
      </span>
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

export function CourseScreen() {
  const t = useTranslations("product");
  return (
    <div>
      <p className="text-overline text-muted-foreground">{t("courses")}</p>
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
