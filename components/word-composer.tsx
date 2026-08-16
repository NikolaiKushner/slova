"use client";

import { useCallback, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLUMN_LABEL } from "@/components/word-table";
import { normalizeKey } from "@/lib/lexicon/key";
import { parseImportText } from "@/lib/parse-import";
import { cn } from "@/lib/utils";

/**
 * The pairs you type words into.
 *
 * Two labelled fields per row — English and Russian — so it is obvious where
 * each half belongs. It holds what you type and nothing else: nothing is
 * translated here and nothing is saved here. There is always one empty row at
 * the bottom, and a paste of several lines expands into a row each.
 *
 * The keyboard is the point. Adding twenty words is twenty small acts of
 * typing, and a form that needs the mouse between each one is a form nobody
 * finishes. So: Tab moves across a row, Enter opens the next one, and
 * Backspace on an empty row takes it back. None of that existed before — Enter
 * did nothing at all, which meant every new row cost a click.
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

type Field = "front" | "back";

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

  /*
   * Focus has to survive a re-render, and the element it belongs to may not
   * exist yet when the keystroke is handled — pressing Enter on the last row
   * creates the row it wants to move into. So the request is queued for the
   * next frame, by which time React has committed and the input is mounted.
   */
  const cells = useRef(new Map<string, HTMLInputElement | null>());
  const focusCell = useCallback((id: string, field: Field) => {
    requestAnimationFrame(() => {
      const input = cells.current.get(`${id}:${field}`);
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }, []);

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
    const next = withTrailingBlank([...before, ...incoming, ...after]);
    onChange(next);
    focusCell(next[next.length - 1]!.id, "front");
  };

  function onKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: Field,
  ) {
    const row = rows[index]!;

    const empty = !row.front.trim() && !row.back.trim();
    const last = index === rows.length - 1;

    if (event.key === "Enter") {
      // Never submits. In a list you are still filling in, Enter means "next
      // line" — the same as it does in every other list.
      event.preventDefault();
      const next = rows[index + 1];
      if (next) {
        focusCell(next.id, "front");
        return;
      }
      // Standing on the trailing blank there is nowhere to go, and adding a
      // second empty row would leave one nothing can remove.
      if (empty) return;
      const created = emptyRow();
      onChange([...rows, created]);
      focusCell(created.id, "front");
      return;
    }

    if (event.key === "Backspace" && empty && rows.length > 1) {
      event.preventDefault();
      const previous = rows[index - 1];
      if (last) {
        // The trailing blank is scaffolding and always stays; Backspace out of
        // it means "take me back to what I was typing".
        if (previous) focusCell(previous.id, "back");
        return;
      }
      onChange(withTrailingBlank(rows.filter((_, i) => i !== index)));
      if (previous) focusCell(previous.id, field);
    }
  }

  return (
    <div>
      <div
        className={cn(
          "bg-muted border-border-subtle grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-3 border-b px-4 py-2.5 max-sm:hidden",
          COLUMN_LABEL,
        )}
      >
        <span>{common("english")}</span>
        <span>{common("russian")}</span>
        <span className="sr-only">{t("remove")}</span>
      </div>

      {/* Ten rows fit; past that it scrolls rather than pushing the set
          picker and the button off the screen. */}
      <div className="max-h-[26rem] overflow-y-auto px-4 py-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="group grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-2 py-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem]"
          >
            <Cell
              value={row.front}
              placeholder={index === rows.length - 1 ? t("typeOrPaste") : ""}
              aria-label={t("englishRow", { row: index + 1 })}
              disabled={disabled}
              lang="en"
              ref={(el) => {
                cells.current.set(`${row.id}:front`, el);
              }}
              onChange={(front) => edit(row.id, { front })}
              onKeyDown={(event) => onKeyDown(event, index, "front")}
              onPasteText={(text) => pasteInto(row.id, text)}
            />
            <Cell
              value={row.back}
              placeholder={index === rows.length - 1 ? t("orLeaveIt") : ""}
              aria-label={t("russianRow", { row: index + 1 })}
              disabled={disabled}
              muted={row.filled}
              className="max-sm:col-span-2"
              ref={(el) => {
                cells.current.set(`${row.id}:back`, el);
              }}
              onChange={(back) => edit(row.id, { back })}
              onKeyDown={(event) => onKeyDown(event, index, "back")}
            />
            <div className="flex justify-end max-sm:col-start-2 max-sm:row-start-1">
              {rows.length > 1 && !disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("removeRow", { row: index + 1 })}
                  /* `row-actions` keeps it visible where there is no hover — see globals.css. */
                  className="row-actions text-disabled-foreground hover:bg-destructive-bg hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => remove(row.id)}
                >
                  <X />
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
  className,
  ref,
  onChange,
  onKeyDown,
  onPasteText,
  ...rest
}: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  muted?: boolean;
  className?: string;
  lang?: string;
  ref?: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onPasteText?: (text: string) => void;
  "aria-label": string;
}) {
  return (
    <Input
      {...rest}
      ref={ref}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      /*
       * §9: iPad substitutes its own spelling into English words and breaks the
       * check that follows. The Russian field keeps its corrections.
       */
      {...(rest.lang === "en"
        ? { autoCapitalize: "none" as const, autoCorrect: "off", spellCheck: false }
        : {})}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onPaste={
        onPasteText
          ? (event) => {
              const text = event.clipboardData.getData("text/plain");
              // A tab means two columns out of a spreadsheet, which is a list
              // even when it is one line long.
              if (!text.includes("\n") && !text.includes("\t")) return;
              event.preventDefault();
              onPasteText(text);
            }
          : undefined
      }
      className={cn(
        "bg-muted hover:bg-secondary focus:bg-card h-11 border-transparent",
        muted && "text-muted-foreground",
        className,
      )}
    />
  );
}
