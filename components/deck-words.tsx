"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORD_GRID, WordTable } from "@/components/word-table";
import { cn } from "@/lib/utils";

export type DeckWord = {
  id: string;
  front: string;
  back: string;
};

export function DeckWords({ words }: { words: DeckWord[] }) {
  return (
    <WordTable>
      <ul className="divide-y divide-border">
        {words.map((word) => (
          <WordRow key={word.id} word={word} />
        ))}
      </ul>
    </WordTable>
  );
}

function WordRow({ word }: { word: DeckWord }) {
  const router = useRouter();
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
    const res = await fetch(`/api/cards/${word.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front, back }),
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not save this word.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (busy) return;
    if (!confirm(`Delete “${word.front}” from this list?`)) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/cards/${word.id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      setError("Could not delete this word.");
      return;
    }

    router.refresh();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") save();
    if (event.key === "Escape") cancel();
  }

  return (
    <li className="group/row px-3 py-2 text-sm">
      <div className={WORD_GRID}>
        {editing ? (
          <>
            <Input
              aria-label="English word"
              value={front}
              autoFocus
              disabled={busy}
              onChange={(e) => setFront(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <Input
              aria-label="Russian translation"
              value={back}
              disabled={busy}
              onChange={(e) => setBack(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <span className="flex justify-end gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Save word"
                title="Save (Enter)"
                disabled={busy}
                onClick={save}
              >
                <Check />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Cancel editing"
                title="Cancel (Escape)"
                disabled={busy}
                onClick={cancel}
              >
                <X />
              </Button>
            </span>
          </>
        ) : (
          <>
            <span className="truncate font-medium">{word.front}</span>
            <span className="truncate text-muted-foreground">{word.back}</span>
            <span
              className={cn(
                "flex justify-end gap-1 transition-opacity",
                "sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100",
              )}
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Edit ${word.front}`}
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${word.front}`}
                className="text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={remove}
              >
                <Trash2 />
              </Button>
            </span>
          </>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </li>
  );
}
