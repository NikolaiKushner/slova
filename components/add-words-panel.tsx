"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { NEW_SET, NO_SET, SetPicker, type SetOption } from "@/components/set-picker";
import { WordComposer, type ComposerRow } from "@/components/word-composer";

/**
 * The top half of the dictionary: type or paste words, choose where they go,
 * add them.
 *
 * Nothing is saved until the button. Everything above it — the rows, the
 * translations that filled themselves in, the edits — is a draft, and a draft
 * that costs nothing to throw away is a draft people will actually correct.
 */
export function AddWordsPanel({ onAdded }: { onAdded: () => void }) {
  const [rows, setRows] = useState<ComposerRow[]>([]);
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setValue, setSetValue] = useState<string>(NO_SET);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sets")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { sets?: SetOption[] } | null) => {
        setSets(payload?.sets ?? []);
      })
      .catch(() => {});
  }, []);

  const complete = rows.filter((row) => row.front.trim() && row.back.trim());
  const waiting = rows.some((row) => row.pending);
  const needsName = setValue === NEW_SET && !newTitle.trim();

  async function submit() {
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        words: complete.map((row) => ({ front: row.front, back: row.back })),
        ...(setValue === NEW_SET
          ? { setTitle: newTitle.trim() }
          : setValue !== NO_SET
            ? { setId: setValue }
            : {}),
      }),
    }).catch(() => null);

    setSaving(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setMessage(payload?.error ?? "Could not add these words.");
      return;
    }

    const result = (await response.json()) as {
      added: number;
      alreadyKnown: number;
      setId: string | null;
    };

    setRows([]);
    setNewTitle("");
    if (result.setId && setValue === NEW_SET) {
      // The set exists now; leave it selected so the next batch lands with it.
      setSetValue(result.setId);
      fetch("/api/sets")
        .then((r) => (r.ok ? r.json() : null))
        .then((p: { sets?: SetOption[] } | null) => setSets(p?.sets ?? []))
        .catch(() => {});
    }

    setMessage(
      result.alreadyKnown > 0
        ? `Added ${result.added}. ${result.alreadyKnown} you already had — those kept their progress.`
        : `Added ${result.added}.`,
    );
    onAdded();
  }

  return (
    <div className="space-y-4">
      <WordComposer rows={rows} onChange={setRows} />

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SetPicker
            sets={sets}
            value={setValue}
            newTitle={newTitle}
            onValueChange={setSetValue}
            onNewTitleChange={setNewTitle}
            disabled={saving}
          />
          <Button
            size="lg"
            onClick={submit}
            disabled={saving || complete.length === 0 || waiting || needsName}
          >
            {waiting
              ? "Translating…"
              : `Add ${complete.length} word${complete.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}

      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}
