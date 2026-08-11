"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { normalizeKey } from "@/lib/lexicon/key";
import { parseImportText } from "@/lib/parse-import";
import { cn } from "@/lib/utils";

/**
 * The table you type words into.
 *
 * It does nothing but hold what you type. Nothing is translated here and
 * nothing is saved here — that all happens once, when the button below is
 * pressed. Typing and waiting are separate states, and mixing them was what
 * made the previous version feel like it had hung: every row said
 * "translating…" while the person was still adding rows.
 *
 * There is always one empty row at the bottom. Type in it and another appears
 * underneath, so the table grows the way a list does. A paste with several
 * lines expands into a row each.
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
    <div className="bg-card overflow-hidden rounded-lg border">
      {/* Ten rows fit; past that the table scrolls rather than pushing the set
          picker and the button off the screen. */}
      <div className="max-h-[26rem] overflow-y-auto">
        <Table>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id} className="group">
                <TableCell className="w-1/2 py-1">
                  <Cell
                    value={row.front}
                    placeholder={index === 0 ? "English word" : ""}
                    aria-label="English word"
                    disabled={disabled}
                    onChange={(front) => edit(row.id, { front })}
                    onPasteText={(text) => pasteInto(row.id, text)}
                  />
                </TableCell>
                <TableCell className="w-1/2 py-1">
                  <Cell
                    value={row.back}
                    placeholder={index === 0 ? "Russian — or leave it to us" : ""}
                    aria-label="Russian translation"
                    disabled={disabled}
                    muted={row.filled}
                    onChange={(back) => edit(row.id, { back })}
                  />
                </TableCell>
                <TableCell className="w-10 py-1">
                  {row.front.trim() && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${row.front}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                      onClick={() => remove(row.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * The shadcn input with its chrome removed rather than a bare `<input>` given
 * borders: a cell is edited in place and must not change height when focused.
 */
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
              if (!text.includes("\n")) return; // one word: let it land normally
              event.preventDefault();
              onPasteText(text);
            }
          : undefined
      }
      className={cn(
        "h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0",
        // A machine translation reads as a suggestion until it is touched.
        muted && "text-muted-foreground",
      )}
    />
  );
}
