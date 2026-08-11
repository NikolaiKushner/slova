"use client";

import { useCallback, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { normalizeKey } from "@/lib/lexicon/key";
import { parseImportText } from "@/lib/parse-import";
import { cn } from "@/lib/utils";

/**
 * The box you add words in: one line at a time, or a whole list at once.
 *
 * One field, two behaviours by size of input. Typing a word and pressing Enter
 * drops a row underneath; pasting a list drops one row per line. The same
 * field does both because they are the same intent — "these are the words" —
 * and asking someone to pick a mode first is asking them to describe what they
 * are about to do before doing it.
 *
 * Translations are not typed. They arrive on their own: instantly for anything
 * the shared base already knows, and then row by row for the rest as the model
 * answers. Every one of them stays editable — machine output is a draft.
 */

export type ComposerRow = {
  id: string;
  front: string;
  back: string;
  /** No translation yet, and one is on its way. */
  pending: boolean;
  /** Asked for, and nothing came back. The row stays, greyed. */
  failed: boolean;
};

let counter = 0;
const nextId = () => `row-${++counter}`;

function makeRow(front: string, back = ""): ComposerRow {
  return { id: nextId(), front, back, pending: !back, failed: false };
}

export function WordComposer({
  rows,
  onChange,
}: {
  rows: ComposerRow[];
  onChange: (rows: ComposerRow[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Rows can change while a translation is in flight, so the stream writes
  // through a ref rather than closing over a stale array.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const translate = useCallback(
    async (targets: ComposerRow[]) => {
      const words = targets.map((row) => row.front);
      if (words.length === 0) return;

      const apply = (updater: (row: ComposerRow) => ComposerRow) => {
        onChange(rowsRef.current.map(updater));
      };

      let response: Response;
      try {
        response = await fetch("/api/translate/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words }),
        });
      } catch {
        apply((row) =>
          targets.some((t) => t.id === row.id)
            ? { ...row, pending: false, failed: true }
            : row,
        );
        return;
      }

      if (!response.ok || !response.body) {
        apply((row) =>
          targets.some((t) => t.id === row.id)
            ? { ...row, pending: false, failed: true }
            : row,
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const answered = new Set<string>();

      // NDJSON: one row per line, and a line can arrive in pieces.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let payload: { text?: string; translation?: string };
          try {
            payload = JSON.parse(line);
          } catch {
            continue;
          }
          if (!payload.text || !payload.translation) continue;

          const key = normalizeKey(payload.text);
          answered.add(key);
          apply((row) =>
            normalizeKey(row.front) === key && !row.back
              ? { ...row, back: payload.translation!, pending: false }
              : row,
          );
        }
      }

      // Anything the server never mentioned is a word it could not translate.
      apply((row) =>
        targets.some((t) => t.id === row.id) && !answered.has(normalizeKey(row.front))
          ? { ...row, pending: false, failed: true }
          : row,
      );
    },
    [onChange],
  );

  const addRows = useCallback(
    (incoming: { front: string; back?: string }[]) => {
      const known = new Set(rowsRef.current.map((row) => normalizeKey(row.front)));
      const fresh: ComposerRow[] = [];

      for (const item of incoming) {
        const front = item.front.trim();
        const key = normalizeKey(front);
        // A word already on the list is not added twice — the same rule the
        // dictionary itself applies.
        if (!key || known.has(key)) continue;
        known.add(key);
        fresh.push(makeRow(front, item.back?.trim() ?? ""));
      }

      if (fresh.length === 0) return;
      onChange([...rowsRef.current, ...fresh]);

      const untranslated = fresh.filter((row) => !row.back);
      if (untranslated.length > 0) void translate(untranslated);
    },
    [onChange, translate],
  );

  const commitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    // A typed line can carry its own translation — "cat — кот" — and the
    // import parser already knows every separator people use.
    addRows(parseImportText(text).cards.map((c) => ({ front: c.front, back: c.back })));
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <Input
        ref={inputRef}
        value={draft}
        placeholder="Type a word and press Enter, or paste a whole list"
        aria-label="Add words"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft();
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain");
          if (!text.includes("\n")) return; // one word: let it land in the field
          event.preventDefault();
          const parsed = parseImportText(text);
          addRows(parsed.cards.map((c) => ({ front: c.front, back: c.back })));
          setDraft("");
        }}
      />

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          {/* Ten rows fit; beyond that the box scrolls rather than pushing the
              set picker and the button off the screen. */}
          <div className="max-h-[26rem] overflow-y-auto">
            <Table>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="w-1/2">{row.front}</TableCell>
                    <TableCell className="w-1/2">
                      <TranslationCell
                        row={row}
                        onEdit={(back) =>
                          onChange(
                            rowsRef.current.map((r) =>
                              r.id === row.id ? { ...r, back, failed: false } : r,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="w-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${row.front}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                        onClick={() =>
                          onChange(rowsRef.current.filter((r) => r.id !== row.id))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function TranslationCell({
  row,
  onEdit,
}: {
  row: ComposerRow;
  onEdit: (back: string) => void;
}) {
  if (row.pending) {
    return (
      <span className="text-muted-foreground text-sm" aria-live="polite">
        translating…
      </span>
    );
  }

  return (
    <Input
      value={row.back}
      onChange={(event) => onEdit(event.target.value)}
      placeholder={row.failed ? "no translation — type one" : ""}
      aria-label={`Translation of ${row.front}`}
      // The primitive, with its chrome removed rather than a bare input
      // dressed up: a row is edited in place and must not change height.
      className={cn(
        "h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0",
        row.failed && !row.back && "text-muted-foreground",
      )}
    />
  );
}
