"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { SetOption } from "@/components/set-picker";

/**
 * Which words this session should draw on.
 *
 * Asked before every training, including Brainstorm, because "practise" is not
 * one thing once there is more than one list. Learning medical vocabulary and
 * revising phrasal verbs are different sittings, and a trainer that decides
 * for you turns the sets into decoration.
 *
 * Several at once: a session is a choice of material, not a folder. Choosing
 * none means everything, which is both the sensible default and the answer
 * for anyone who has not made sets at all — they never see a decision they
 * have no way to make.
 */
export function SetChooser({
  title,
  onStart,
}: {
  title: string;
  onStart: (setIds: string[]) => void;
}) {
  const t = useTranslations("practice");
  const dictionary = useTranslations("dictionary");
  const common = useTranslations("common");
  const [sets, setSets] = useState<SetOption[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/sets")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { sets?: SetOption[] } | null) => {
        if (ignore) return;
        const list = payload?.sets ?? [];
        setSets(list);
        // Nothing to choose between: start rather than asking a question with
        // one answer.
        if (list.length === 0) onStart([]);
      })
      .catch(() => {
        if (!ignore) setSets([]);
      });
    return () => {
      ignore = true;
    };
  }, [onStart]);

  if (sets === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (sets.length === 0) return null;

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

  const words = chosen.length
    ? sets
        .filter((set) => chosen.includes(set.id))
        .reduce((sum, set) => sum + (set.wordCount ?? 0), 0)
    : null;

  return (
    <div className="space-y-6">
      <p className="text-brand-soft text-center text-xs tracking-widest uppercase">
        {t("whereFrom", { title })}
      </p>

      <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
        <Row
          label={t("allMyWords")}
          hint={t("everythingInDictionary")}
          checked={chosen.length === 0}
          onToggle={() => setChosen([])}
        />
        {sets.map((set) => (
          <Row
            key={set.id}
            label={set.title}
            hint={
              typeof set.wordCount === "number"
                ? dictionary("summaryWords", { count: set.wordCount })
                : undefined
            }
            checked={chosen.includes(set.id)}
            onToggle={() => toggle(set.id)}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button type="button" size="lg" onClick={() => onStart(chosen)} autoFocus>
          {common("start")}
        </Button>
        {words !== null && (
          <p className="text-muted-foreground text-xs">
            {t("wordsToDraw", { count: words })}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="hover:bg-accent/40 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-muted-foreground text-sm">{hint}</span>}
    </label>
  );
}
