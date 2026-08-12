"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Minus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORD_GRID, WordTable } from "@/components/word-table";
import { cn } from "@/lib/utils";

export type SetWord = {
  id: string;
  front: string;
  back: string;
};

export function SetWords({ setId, words }: { setId: string; words: SetWord[] }) {
  return (
    <WordTable>
      <ul className="divide-y divide-border">
        {words.map((word) => (
          <WordRow key={word.id} setId={setId} word={word} />
        ))}
      </ul>
    </WordTable>
  );
}

function WordRow({ setId, word }: { setId: string; word: SetWord }) {
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
    const res = await fetch(`/api/words/${word.id}`, {
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

  /**
   * Takes the word out of this set and leaves everything else alone — the word
   * stays in the dictionary with its translation and its schedule, and stays
   * in any other set it belongs to. Deleting a word outright belongs on the
   * dictionary page, where the whole list is.
   *
   * No confirmation: nothing is lost, and the word is one click from going
   * back in.
   */
  async function remove() {
    if (busy) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/sets/${setId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: word.id }),
    });
    setBusy(false);

    if (!res.ok) {
      setError("Could not remove this word from the set.");
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
                aria-label={`Remove ${word.front} from this set`}
                className="text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={remove}
              >
                <Minus />
              </Button>
            </span>
          </>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </li>
  );
}
