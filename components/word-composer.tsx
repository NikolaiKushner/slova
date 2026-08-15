"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORD_GRID, COLUMN_HEADER } from "@/components/word-table";
import { normalizeKey } from "@/lib/lexicon/key";
import { parseImportText } from "@/lib/parse-import";
import { cn } from "@/lib/utils";

/**
 * The pairs you type words into.
 *
 * Two labelled fields per row — English and Russian — so it is obvious where
 * each half belongs. It still does nothing but hold what you type: nothing is
 * translated here and nothing is saved here. There is always one empty row at
 * the bottom; a paste with several lines expands into a row each.
 */

export type ComposerRow = {
  id: string;
  front: string;
  back: string;
  /** Filled in by the translation pass after Add, rather than typed. */
  filled?: boolean;
};

let counter = 0;
export const emptyRow = (): ComposerRow => ({
  id: `row-${++counter}`,
  front: "",
  back: "",
});

/** Rows with a word in them — the empty tail is scaffolding, not content. */
export function filledRows(rows: readonly ComposerRow[]): ComposerRow[] {
  return rows.filter((row) => row.front.trim());
}

/** Keeps exactly one blank row at the end, however the table was edited. */
function withTrailingBlank(rows: ComposerRow[]): ComposerRow[] {
  const trimmed = rows.filter(
    (row, index) => row.front.trim() || row.back.trim() || index === rows.length - 1,
  );
  const last = trimmed[trimmed.length - 1];
  return last && !last.front.trim() && !last.back.trim()
    ? trimmed
    : [...trimmed, emptyRow()];
}

export function WordComposer({
  rows,
  onChange,
  disabled,
}: {
  rows: ComposerRow[];
  onChange: (rows: ComposerRow[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("dictionary");
  const common = useTranslations("common");

  const edit = (id: string, patch: Partial<ComposerRow>) => {
    onChange(
      withTrailingBlank(
        rows.map((row) =>
          row.id === id ? { ...row, ...patch, filled: false } : row,
        ),
      ),
    );
  };

  const remove = (id: string) => {
    onChange(withTrailingBlank(rows.filter((row) => row.id !== id)));
  };

  /** A multi-line paste becomes rows, starting at the one pasted into. */
  const pasteInto = (id: string, text: string) => {
    const parsed = parseImportText(text);
    const known = new Set(
      rows
        .filter((row) => row.id !== id && row.front.trim())
        .map((row) => normalizeKey(row.front)),
    );

    const incoming: ComposerRow[] = [];
    for (const card of parsed.cards) {
      const key = normalizeKey(card.front);
      // The same word twice in one paste is one row — the dictionary would
      // collapse them anyway, and seeing the duplicate here is confusing.
      if (!key || known.has(key)) continue;
      known.add(key);
      incoming.push({ ...emptyRow(), front: card.front, back: card.back });
    }
    if (incoming.length === 0) return;

    const at = rows.findIndex((row) => row.id === id);
    const before = rows.slice(0, at);
    const after = rows.slice(at + 1);
    onChange(withTrailingBlank([...before, ...incoming, ...after]));
  };

  return (
    <div>
      <div
        className={cn(WORD_GRID, COLUMN_HEADER)}
      >
        <span>{common("english")}</span>
        <span>{common("russian")}</span>
        <span className="sr-only">{t("remove")}</span>
      </div>
      {/* Ten rows fit; past that it scrolls rather than pushing the set
          picker and the button off the screen. */}
      <div className="max-h-[26rem] space-y-2 overflow-y-auto p-2">
        {rows.map((row, index) => (
          <div key={row.id} className={cn(WORD_GRID, "group")}>
            <Cell
              value={row.front}
              placeholder={index === rows.length - 1 ? t("typeOrPaste") : ""}
              aria-label={t("englishWord")}
              disabled={disabled}
              onChange={(front) => edit(row.id, { front })}
              onPasteText={(text) => pasteInto(row.id, text)}
            />
            <Cell
              value={row.back}
              placeholder={
                index === rows.length - 1 ? t("orLeaveIt") : ""
              }
              aria-label={t("russianTranslation")}
              disabled={disabled}
              muted={row.filled}
              onChange={(back) => edit(row.id, { back })}
            />
            <div className="flex justify-end">
              {row.front.trim() && !disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("removeWord", { word: row.front })}
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                  onClick={() => remove(row.id)}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({
  value,
  placeholder,
  disabled,
  muted,
  onChange,
  onPasteText,
  ...rest
}: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  muted?: boolean;
  onChange: (value: string) => void;
  onPasteText?: (text: string) => void;
  "aria-label": string;
}) {
  return (
    <Input
      {...rest}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onPaste={
        onPasteText
          ? (event) => {
              const text = event.clipboardData.getData("text/plain");
              if (!text.includes("\n")) return;
              event.preventDefault();
              onPasteText(text);
            }
          : undefined
      }
      className={cn("h-9 bg-background", muted && "text-muted-foreground")}
    />
  );
}
