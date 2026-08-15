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
        "pointer-events-none overflow-hidden rounded-xl border border-border bg-card shadow-sm select-none",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <BrandWordmark className="ml-3 text-sm" />
      </div>
      <div className="flex bg-background">
        {chrome === "window" ? (
          <aside className="hidden w-40 shrink-0 border-r border-sidebar-border bg-sidebar p-3 sm:block">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
              {t("tasks")}
            </p>
            <p
              className={cn(
                "rounded-md px-2 py-1 text-sm",
                active === "today"
                  ? "bg-sidebar-active"
                  : "text-muted-foreground",
              )}
            >
              {t("today")}
            </p>
            <p className="mt-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
              {t("practice")}
            </p>
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {t("trainings")}
            </p>
            <p className="mt-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
              {t("courses")}
            </p>
            <p
              className={cn(
                "rounded-md px-2 py-1 text-sm",
                active === "courses"
                  ? "bg-sidebar-active"
                  : "text-muted-foreground",
              )}
            >
              {t("grammar")}
            </p>
            <p className="mt-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
              {t("dictionary")}
            </p>
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {t("myWords")}
            </p>
          </aside>
        ) : null}
        <div
          className={cn(
            "min-w-0 flex-1",
            compact ? "px-5 py-5" : "px-6 py-6 sm:px-8 sm:py-7",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** A cropped fragment — no window chrome, so three can sit in a row. */
export function ProductPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden rounded-xl border border-border bg-card shadow-sm select-none",
        className,
      )}
      aria-hidden
    >
      <div className="bg-background px-5 py-5">{children}</div>
    </div>
  );
}

export function TodayScreen() {
  const t = useTranslations("product");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          {t("todayEyebrow")}
        </p>
        <p className="font-display text-3xl tracking-tight sm:text-4xl">
          {t("todayTitle")}
        </p>
        <p className="text-sm text-muted-foreground">{t("todayBody")}</p>
      </header>
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
        {t("todayProgress")}
      </p>
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          {t("yourWords")}
        </p>
        <div className="flex h-2 overflow-hidden rounded-full bg-border">
          <span className="h-full w-[35%] bg-primary" />
          <span className="h-full w-[40%] bg-brand-soft" />
          <span className="h-full w-[25%] bg-border" />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="font-medium">14</span>
            <span className="text-muted-foreground">{t("learned")}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-soft" />
            <span className="font-medium">16</span>
            <span className="text-muted-foreground">{t("learning")}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-border" />
            <span className="font-medium">10</span>
            <span className="text-muted-foreground">{t("notStarted")}</span>
          </span>
        </div>
      </div>
      <span className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
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
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          {t("myWords")}
        </p>
        <p className="font-display text-3xl tracking-tight">{t("addWords")}</p>
      </header>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 gap-px bg-border text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">
          <p className="bg-card px-3 py-2">{t("english")}</p>
          <p className="bg-card px-3 py-2">{t("russian")}</p>
        </div>
        {WORDS.map(([en, ru]) => (
          <div
            key={en}
            className="grid grid-cols-2 border-t border-border text-sm"
          >
            <p className="px-3 py-2.5">{en}</p>
            <p className="px-3 py-2.5 text-muted-foreground">{ru}</p>
          </div>
        ))}
        <div className="grid grid-cols-2 border-t border-border text-sm text-muted-foreground">
          <p className="px-3 py-2.5">{t("typeOrPaste")}</p>
          <p className="px-3 py-2.5"> </p>
        </div>
      </div>
      <span className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
        {t("addWords")}
      </span>
    </div>
  );
}

export function PracticeScreen() {
  const t = useTranslations("product");
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
        {t("word")}
      </p>
      <p className="font-display text-4xl tracking-tight sm:text-5xl">hello</p>
      <div className="grid gap-2">
        {["привет", "пока", "спасибо", "пожалуйста"].map((option, i) => (
          <div
            key={option}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
              i === 0
                ? "border-primary/30 bg-accent text-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <span className="w-4 text-xs text-brand-soft">{i + 1}</span>
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PracticeChoiceStill() {
  return (
    <div className="space-y-4">
      <p className="font-display text-2xl tracking-tight">hello</p>
      <div className="grid gap-2">
        {["привет", "пока", "спасибо", "пожалуйста"].map((option, i) => (
          <div
            key={option}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              i === 0
                ? "border-primary/30 bg-accent text-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <span className="w-4 text-xs text-brand-soft">{i + 1}</span>
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PracticeAudioStill() {
  const t = useTranslations("practice");
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">
        {t("listen")}
      </p>
      <span className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground">
        <Volume2 className="size-5 text-brand-soft" />
        {t("play")}
      </span>
      <div className="grid w-full gap-2">
        {["привет", "пока", "спасибо", "пожалуйста"].map((option, i) => (
          <div
            key={option}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              i === 0
                ? "border-primary/30 bg-accent text-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PracticeTypingStill() {
  const t = useTranslations("practice");
  const common = useTranslations("common");
  return (
    <div className="space-y-4">
      <p className="font-display text-2xl tracking-tight">получить</p>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground">
          {t("typeEnglish")}
        </div>
        <span className="inline-flex h-9 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          {common("check")}
        </span>
      </div>
    </div>
  );
}

const LESSONS = [
  ["Forms", "Форма"],
  ["Use", "Когда"],
  ["Spelling", "-s / -es / -ies"],
  ["Negatives", "Отрицание"],
  ["Questions", "Вопросы"],
  ["Test", "Проверка"],
] as const;

export function CourseScreen() {
  const t = useTranslations("product");
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          {t("courses")}
        </p>
        <p className="font-display text-3xl tracking-tight">Present Simple</p>
        <p className="text-sm text-muted-foreground">Простое настоящее</p>
      </header>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {LESSONS.map(([en, ru], index) => (
          <div
            key={en}
            className="flex items-baseline gap-3 border-t border-border px-3 py-2.5 first:border-t-0"
          >
            <span className="w-4 shrink-0 text-sm tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="font-display text-base leading-snug">{en}</span>
              <span className="ml-2 text-sm text-muted-foreground">{ru}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
