"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SetOption } from "@/components/set-picker";

/**
 * Narrowing the list: text on either side of the card, and which set.
 *
 * The search box is debounced rather than live, because every keystroke here
 * is a database query and a URL change. A third of a second is long enough
 * that typing "kitchen" is one query instead of seven, and short enough that
 * nobody notices waiting.
 */

const ALL_SETS = "all";
export const NO_SET_FILTER = "none";

const DEBOUNCE_MS = 300;

export function WordListFilters({
  query,
  set,
  sets,
  onQueryChange,
  onSetChange,
}: {
  query: string;
  set: string;
  sets: SetOption[];
  onQueryChange: (value: string) => void;
  onSetChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(query);

  // The box is typed into; the filter follows a moment later. Only the local
  // value is state — the committed one belongs to the URL.
  useEffect(() => {
    if (draft === query) return;
    const timer = setTimeout(() => onQueryChange(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, query, onQueryChange]);

  const selected = set || ALL_SETS;
  const label =
    selected === ALL_SETS
      ? "All sets"
      : selected === NO_SET_FILTER
        ? "No set"
        : (sets.find((option) => option.id === selected)?.title ?? "All sets");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-64 max-w-full">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search words and translations"
          aria-label="Search words"
          className="h-8 pl-8"
        />
        {draft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            className="absolute top-1/2 right-0.5 -translate-y-1/2"
            onClick={() => {
              setDraft("");
              onQueryChange("");
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <Select
        value={selected}
        onValueChange={(next) =>
          onSetChange(!next || next === ALL_SETS ? "" : next)
        }
      >
        <SelectTrigger className="w-52" aria-label="Filter by set">
          <SelectValue placeholder="All sets">{label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SETS}>All sets</SelectItem>
          <SelectItem value={NO_SET_FILTER}>No set</SelectItem>
          {sets.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
