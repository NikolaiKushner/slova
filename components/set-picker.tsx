"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Which set the words being added should join — an existing one, a new one
 * named here, or none.
 *
 * "None" is a real answer rather than a way out of the question. A word
 * belongs to the dictionary; sets are tags on top of it, and the model has
 * been built that way since `WordSetItem` replaced the old one-deck-per-card
 * arrangement. Forcing a set here would put that back.
 */

export const NO_SET = "";
export const NEW_SET = "__new__";

export type SetOption = { id: string; title: string; wordCount?: number };

export function SetPicker({
  sets,
  value,
  newTitle,
  onValueChange,
  onNewTitleChange,
  disabled,
}: {
  sets: SetOption[];
  /** A set id, or NO_SET, or NEW_SET. */
  value: string;
  newTitle: string;
  onValueChange: (value: string) => void;
  onNewTitleChange: (title: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("dictionary");
  const selectedLabel =
    value === NEW_SET
      ? t("newSetEllipsis")
      : (sets.find((set) => set.id === value)?.title ?? t("noSet"));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={value}
        onValueChange={(next) => onValueChange(next ?? NO_SET)}
        disabled={disabled}
      >
        <SelectTrigger className="sm:w-64" aria-label={t("set")}>
          {/* The label is chosen here rather than left to the primitive: the
              "new set" option carries a sentinel for a value, and the trigger
              was rendering that sentinel at the user. */}
          <SelectValue placeholder={t("noSet")}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SET}>{t("noSet")}</SelectItem>
          {sets.map((set) => (
            <SelectItem key={set.id} value={set.id}>
              {set.title}
              {typeof set.wordCount === "number" ? ` · ${set.wordCount}` : ""}
            </SelectItem>
          ))}
          <SelectItem value={NEW_SET}>{t("newSetEllipsis")}</SelectItem>
        </SelectContent>
      </Select>

      {value === NEW_SET && (
        <Input
          value={newTitle}
          onChange={(event) => onNewTitleChange(event.target.value)}
          placeholder={t("nameNewSet")}
          aria-label={t("newSetName")}
          disabled={disabled}
          className="sm:w-64"
          autoFocus
        />
      )}
    </div>
  );
}
