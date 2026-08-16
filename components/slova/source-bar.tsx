"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SOURCE_STATES,
  THIN_SESSION,
  type Source,
  type SourceState,
} from "@/lib/practice/source";
import { cn } from "@/lib/utils";

export type SourceCounts = {
  states: Record<SourceState, number>;
  sets: { id: string; title: string; count: number }[];
  unfiled: number;
};

export type { Source };

/**
 * One line saying what the next session will draw on, and a panel to change it
 * — §14, and the shape the trainings mockup settled on.
 *
 * It replaces a second screen. Choosing material used to be a page you passed
 * through on the way to every training, which put a decision between the
 * person and the thing they came to do, and asked it again on the way back.
 * Here the choice is a sentence at the top of the page: readable without being
 * opened, changed in place, and the same for every mode and every format below.
 */
export function SourceBar({
  value,
  onChange,
  onCounts,
  className,
}: {
  value: Source;
  onChange: (next: Source) => void;
  /** The same numbers, handed up so the mode cards do not fetch them again. */
  onCounts?: (counts: SourceCounts) => void;
  className?: string;
}) {
  const t = useTranslations("practice");
  const [counts, setCounts] = useState<SourceCounts | null>(null);
  const [open, setOpen] = useState(false);
  /*
   * The panel is anchored to the whole bar, not to the button that opens it.
   * §13 says its width follows the trigger, and here the trigger is a small
   * "Change" — anchored to that, the four state cards had to wrap into three
   * lines each and the counts collided with their hints. The bar is what the
   * panel belongs to; the button is only the handle.
   */
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    const query = value.setIds.map((id) => `set=${encodeURIComponent(id)}`).join("&");
    fetch(`/api/practice/counts?${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: SourceCounts | null) => {
        if (ignore || !payload) return;
        setCounts(payload);
        onCounts?.(payload);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
    // `onCounts` deliberately out of the deps: it is a report, and a caller
    // passing a fresh closure each render would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.setIds]);

  const total = counts?.states[value.state] ?? null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={bar}
        className="bg-card border-border flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-lg border px-4 py-3"
      >
        <span className="text-muted-foreground text-caption shrink-0">
          {t("studying")}
        </span>
        <span className="font-medium">{describe(t, value, counts)}</span>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                {t("changeSource")}
                <ChevronDown
                  className={cn("transition-transform", open && "rotate-180")}
                />
              </Button>
            }
          />
          <PopoverContent
            anchor={bar}
            align="start"
            sideOffset={8}
            className="shadow-pop w-(--anchor-width) p-5"
          >
            <SourcePanel
              value={value}
              counts={counts}
              onChange={onChange}
              onDone={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-caption ml-auto shrink-0 tabular-nums">
          {total === null ? (
            <Skeleton className="inline-block h-4 w-24 align-middle" />
          ) : (
            t.rich("wordsFit", {
              count: total,
              n: (chunks) => (
                <b className="text-primary font-semibold">{chunks}</b>
              ),
            })
          )}
        </span>
      </div>
    </div>
  );
}

function SourcePanel({
  value,
  counts,
  onChange,
  onDone,
}: {
  value: Source;
  counts: SourceCounts | null;
  onChange: (next: Source) => void;
  onDone: () => void;
}) {
  const t = useTranslations("practice");
  const common = useTranslations("common");
  const total = counts?.states[value.state] ?? 0;

  const toggleSet = (id: string) =>
    onChange({
      ...value,
      setIds: value.setIds.includes(id)
        ? value.setIds.filter((existing) => existing !== id)
        : [...value.setIds, id],
    });

  return (
    <div>
      <h3 className="text-overline text-eyebrow mb-2.5">{t("whichWords")}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {SOURCE_STATES.map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => onChange({ ...value, state })}
            aria-pressed={value.state === state}
            className={cn(
              "focus-ring flex items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors",
              value.state === state
                ? "border-accent-border bg-accent text-accent-foreground"
                : "border-border bg-card hover:border-ring",
            )}
          >
            {/*
             * A radio drawn rather than a RadioGroup: §13 asks for the choice
             * to read as cards, and the dot is the card's own mark.
             */}
            <span
              aria-hidden
              className={cn(
                "relative size-[15px] shrink-0 rounded-full border",
                value.state === state
                  ? "border-primary bg-primary after:absolute after:inset-[3.5px] after:rounded-full after:bg-card after:content-['']"
                  : "border-input",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm leading-tight">
                {t(`state_${state}` as "state_due")}
              </span>
              <span
                className={cn(
                  "block text-caption leading-tight",
                  value.state === state
                    ? "text-accent-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {t(`stateHint_${state}` as "stateHint_due")}
              </span>
            </span>
            <span className="text-caption shrink-0 tabular-nums">
              {counts ? counts.states[state] : "—"}
            </span>
          </button>
        ))}
      </div>

      <h3 className="text-overline text-eyebrow mt-6 mb-2.5">{t("whereFromOptional")}</h3>
      <div className="flex flex-wrap gap-2">
        <Chip
          active={value.setIds.length === 0}
          onClick={() => onChange({ ...value, setIds: [] })}
        >
          {t("allSets")}
        </Chip>
        {counts?.sets.map((set) => (
          <Chip
            key={set.id}
            active={value.setIds.includes(set.id)}
            onClick={() => toggleSet(set.id)}
            count={set.count}
          >
            {set.title}
          </Chip>
        ))}
      </div>

      <div className="border-border-subtle mt-6 flex items-center justify-between gap-4 border-t pt-4">
        <span className="text-muted-foreground text-caption">
          {t.rich("wordsFit", {
            count: total,
            n: (chunks) => <b className="text-foreground font-semibold">{chunks}</b>,
          })}
          {/*
           * A thin session is worth saying and not worth blocking (§16): four
           * due words are still four words worth drilling.
           */}
          {total < THIN_SESSION ? (
            <span className="text-warning ml-2 inline-flex items-center gap-1">
              <TriangleAlert className="size-3.5" />
              {t("thinSession")}
            </span>
          ) : null}
        </span>
        <Button size="sm" onClick={onDone}>
          {common("done")}
        </Button>
      </div>
    </div>
  );
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm transition-colors",
        active
          ? "border-accent-border bg-accent text-accent-foreground font-medium"
          : "border-border bg-card text-foreground hover:border-ring",
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span
          className={cn(
            "text-caption tabular-nums",
            active ? "opacity-75" : "text-disabled-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** "new words · Easy, My words" — the sentence the bar reads out. */
function describe(
  t: ReturnType<typeof useTranslations<"practice">>,
  value: Source,
  counts: SourceCounts | null,
) {
  const state = t(`stateName_${value.state}` as "stateName_due");
  if (value.setIds.length === 0 || !counts) return state;

  const names = value.setIds
    .map((id) => counts.sets.find((set) => set.id === id)?.title)
    .filter(Boolean) as string[];
  if (names.length === 0) return state;

  return names.length <= 2
    ? `${state} · ${names.join(", ")}`
    : `${state} · ${t("setsCount", { count: names.length })}`;
}

/** A badge for a format that needs a voice. Small enough to live here. */
export function NeedsSoundTag({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="text-disabled-foreground h-4 px-1.5 text-[10px]">
      {children}
    </Badge>
  );
}
