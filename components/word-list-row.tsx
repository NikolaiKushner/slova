"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { WordRating } from "@/components/word-rating";
import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/word-rating";

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
  onChanged,
}: {
  word: WordRow;
  onChanged: () => void;
}) {
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
      setError("A word needs a translation.");
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
      setError(payload?.error ?? "Could not save this word.");
      return;
    }

    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (busy) return;
    // This one really does take the word away — its progress goes with it, and
    // it leaves every set at once. Worth asking about.
    if (!confirm(`Delete “${word.front}” from your dictionary?`)) return;

    setBusy(true);
    setError(null);
    const response = await fetch(`/api/words/${word.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      setError("Could not delete this word.");
      return;
    }

    onChanged();
  }

  const cellInput = "h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0";

  return (
    <TableRow className="group">
      <TableCell className="font-medium">
        {editing ? (
          <Input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            onKeyDown={onKeys(save, cancel)}
            aria-label="English word"
            disabled={busy}
            className={cellInput}
            autoFocus
          />
        ) : (
          word.front
        )}
      </TableCell>

      <TableCell>
        {editing ? (
          <Input
            value={back}
            onChange={(event) => setBack(event.target.value)}
            onKeyDown={onKeys(save, cancel)}
            aria-label="Russian translation"
            disabled={busy}
            className={cellInput}
          />
        ) : (
          word.back
        )}
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>

      <TableCell>
        {word.sets.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {word.sets.map((set) => (
              <Badge key={set.id} variant="secondary">
                {set.title}
              </Badge>
            ))}
          </span>
        )}
      </TableCell>

      <TableCell>
        <WordRating rating={word.rating} />
      </TableCell>

      <TableCell className="w-20">
        <span
          className={cn(
            "flex justify-end gap-1 transition-opacity",
            // Quiet until wanted — and always visible where there is no hover.
            editing
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100",
          )}
        >
          {editing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Save word"
                disabled={busy}
                onClick={save}
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cancel editing"
                disabled={busy}
                onClick={cancel}
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${word.front}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${word.front}`}
                // Muted at rest, red only on hover — never red beside a primary.
                className="text-muted-foreground hover:text-destructive"
                onClick={remove}
              >
                <Trash2 className="size-4" />
              </Button>
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
