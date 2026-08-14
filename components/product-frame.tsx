import { BrandWordmark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

/**
 * A still of the app, for the public pages. It is markup, not a screenshot:
 * it uses the same tokens as the real shell so it cannot drift into a
 * different product. Decorative — pointer-events off, hidden from AT.
 */
export function ProductFrame({
  children,
  className,
  compact = false,
  active = "today",
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  active?: "today" | "courses";
}) {
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
        <aside className="hidden w-40 shrink-0 border-r border-sidebar-border bg-sidebar p-3 sm:block">
          <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
            Tasks
          </p>
          <p
            className={cn(
              "rounded-md px-2 py-1 text-sm",
              active === "today"
                ? "bg-sidebar-active"
                : "text-muted-foreground",
            )}
          >
            Today
          </p>
          <p className="mt-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
            Practice
          </p>
          <p className="px-2 py-1 text-sm text-muted-foreground">Trainings</p>
          <p className="mt-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
            Courses
          </p>
          <p
            className={cn(
              "rounded-md px-2 py-1 text-sm",
              active === "courses"
                ? "bg-sidebar-active"
                : "text-muted-foreground",
            )}
          >
            Grammar
          </p>
          <p className="mt-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-soft">
            Dictionary
          </p>
          <p className="px-2 py-1 text-sm text-muted-foreground">My words</p>
        </aside>
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

export function TodayScreen() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          Today
        </p>
        <p className="font-display text-3xl tracking-tight sm:text-4xl">
          12 words ready
        </p>
        <p className="text-sm text-muted-foreground">
          A short session now keeps them sticky.
        </p>
      </header>
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
        8 reviewed today · 5-day streak
      </p>
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          Your words
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
            <span className="text-muted-foreground">learned</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-soft" />
            <span className="font-medium">16</span>
            <span className="text-muted-foreground">learning</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-border" />
            <span className="font-medium">10</span>
            <span className="text-muted-foreground">not started</span>
          </span>
        </div>
      </div>
      <span className="inline-flex h-9 items-center rounded-lg bg-teal-800 px-3 text-sm font-medium text-white">
        Study now
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
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          My words
        </p>
        <p className="font-display text-3xl tracking-tight">Add words</p>
      </header>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 gap-px bg-border text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">
          <p className="bg-card px-3 py-2">English</p>
          <p className="bg-card px-3 py-2">Russian</p>
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
          <p className="px-3 py-2.5">Type or paste</p>
          <p className="px-3 py-2.5"> </p>
        </div>
      </div>
    </div>
  );
}

export function PracticeScreen() {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
        Word
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

const LESSONS = [
  ["Forms", "Форма"],
  ["Use", "Когда"],
  ["Spelling", "-s / -es / -ies"],
  ["Negatives", "Отрицание"],
  ["Questions", "Вопросы"],
  ["Test", "Проверка"],
] as const;

export function CourseScreen() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
          Courses
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
