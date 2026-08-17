"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROW_ICON, ROW_ICON_DESTROY } from "@/components/word-table";
import { WordRating } from "@/components/word-rating";
import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/word-rating";
import { shortenSetTitle, VISIBLE_SET_BADGES } from "@/lib/words/set-label";

/**
 * One row of the dictionary, editable in place.
 *
 * The list is the only screen that shows every word — including the ones in no
 * set at all — so it has to be the place a word can be corrected or thrown
 * away. Without that, a word added without a set was reachable from nowhere.
 *
 * Editing swaps the two cells for inputs and leaves the row the same height;
 * Enter saves, Escape cancels, and there is no modal.
 */

export type WordRow = {
  id: string;
  front: string;
  back: string;
  sets: { id: string; title: string }[];
  rating: Rating;
};

export function WordListRow({
  word,
  selected,
  onSelect,
  onChanged,
  activeSetId,
  onSetFilter,
}: {
  word: WordRow;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onChanged: () => void;
  /** The set the table is already filtered to — omitted from the column. */
  activeSetId?: string;
  onSetFilter?: (setId: string) => void;
}) {
  const t = useTranslations("dictionary");
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(word.front);
  const [back, setBack] = useState(word.back);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setFront(word.front);
    setBack(word.back);
    setError(null);
    setEditing(false);
  }

  async function save() {
    if (busy) return;
    if (!front.trim() || !back.trim()) {
      setError(t("needsTranslation"));
      return;
    }
    if (front.trim() === word.front && back.trim() === word.back) {
      cancel();
      return;
    }

    setBusy(true);
    setError(null);
    const response = await fetch(`/api/words/${word.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: front.trim(), back: back.trim() }),
    }).catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? t("couldNotSave"));
      return;
    }

    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/words/${word.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      setError(t("couldNotDelete"));
      return;
    }

    onChanged();
  }

  const cellInput = "h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0";
  const visibleSets = word.sets.filter((set) => set.id !== activeSetId);

  return (
    <TableRow className="group" data-state={selected ? "selected" : undefined}>
      <TableCell className="w-[46px] ps-4">
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onSelect(value === true)}
          aria-label={t("selectWord", { word: word.front })}
        />
      </TableCell>
      <TableCell className="overflow-hidden font-medium text-ellipsis leading-5">
        {editing ? (
          <Input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            onKeyDown={onKeys(save, cancel)}
            aria-label={t("englishWord")}
            disabled={busy}
            className={cellInput}
            autoFocus
          />
        ) : (
          word.front
        )}
      </TableCell>

      <TableCell className="leading-5">
        {editing ? (
          <Input
            value={back}
            onChange={(event) => setBack(event.target.value)}
            onKeyDown={onKeys(save, cancel)}
            aria-label={t("russianTranslation")}
            disabled={busy}
            className={cellInput}
          />
        ) : (
          word.back
        )}
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>

      <TableCell className="w-[148px]">
        <SetBadges sets={visibleSets} onFilter={onSetFilter} />
      </TableCell>

      <TableCell className="w-[104px]">
        <span className="inline-flex h-5 items-center">
          <WordRating rating={word.rating} />
        </span>
      </TableCell>

      <TableCell className="w-[78px] pe-3 text-right">
        <span
          className={cn(
            // `row-actions` is the escape hatch from globals.css: under
            // `pointer: coarse` it forces these visible. The width query it
            // replaces only covered phones, so on an iPad — no hover and 1024
            // wide — the row had no visible actions at all.
            "row-actions flex justify-end gap-1 transition-opacity",
            editing
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          {editing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("saveWord")}
                disabled={busy}
                onClick={save}
                className={ROW_ICON}
              >
                <Check strokeWidth={1.75} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("cancelEditing")}
                disabled={busy}
                onClick={cancel}
                className={ROW_ICON}
              >
                <X strokeWidth={1.75} />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editWord", { word: word.front })}
                onClick={() => setEditing(true)}
                className={ROW_ICON}
              >
                <Pencil strokeWidth={1.75} />
              </Button>
              <ConfirmDelete
                title={t("deleteWordTitle", { word: word.front })}
                description={t("deleteWordBody")}
                onConfirm={remove}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("deleteWord", { word: word.front })}
                  className={ROW_ICON_DESTROY}
                >
                  <Trash2 strokeWidth={1.75} />
                </Button>
              </ConfirmDelete>
            </>
          )}
        </span>
      </TableCell>
    </TableRow>
  );
}

function onKeys(save: () => void, cancel: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };
}

function SetBadges({
  sets,
  onFilter,
}: {
  sets: { id: string; title: string }[];
  onFilter?: (setId: string) => void;
}) {
  const t = useTranslations("dictionary");
  if (sets.length === 0) return null;

  const shown = sets.slice(0, VISIBLE_SET_BADGES);
  const hidden = sets.slice(VISIBLE_SET_BADGES);
  const extra = hidden.map((set) => set.title).join(", ");

  return (
    <span className="inline-flex h-5 items-center gap-1.5">
      {shown.map((set) => {
        const label = shortenSetTitle(set.title);
        return (
          <Tooltip key={set.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => onFilter?.(set.id)}
                  aria-label={t("showSet", { title: set.title })}
                  className="inline-flex h-5 items-center rounded-full border-0 bg-transparent p-0 leading-none"
                />
              }
            >
              <Badge
                variant="secondary"
                className="pointer-events-none h-5 min-w-5 px-1.5 text-[11px] font-medium"
              >
                {label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{set.title}</TooltipContent>
          </Tooltip>
        );
      })}
      {hidden.length > 0 ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground inline-flex h-5 items-center border-0 bg-transparent p-0 text-[11px] leading-none font-medium tabular-nums"
                aria-label={t("moreSets", {
                  count: hidden.length,
                  titles: extra,
                })}
              />
            }
          >
            +{hidden.length}
          </TooltipTrigger>
          <TooltipContent>{extra}</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}
