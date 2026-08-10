"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DeckWord = {
  id: string;
  front: string;
  back: string;
};

export function DeckWords({ words }: { words: DeckWord[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white/80">
      {words.map((word) => (
        <WordRow key={word.id} word={word} />
      ))}
    </ul>
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

  if (editing) {
    return (
      <li className="px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            aria-label="Word"
            value={front}
            autoFocus
            disabled={busy}
            onChange={(e) => setFront(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="sm:flex-1"
          />
          <Input
            aria-label="Translation"
            value={back}
            disabled={busy}
            onChange={(e) => setBack(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="sm:flex-1"
          />
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={save}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={cancel}
            >
              Cancel
            </Button>
          </div>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </li>
    );
  }

  return (
    <li className="group px-4 py-3 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{word.front}</span>
        <div className="flex items-baseline gap-3">
          <span className="text-right text-muted-foreground">{word.back}</span>
          <span className="flex shrink-0 items-center gap-1 self-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </li>
  );
}
