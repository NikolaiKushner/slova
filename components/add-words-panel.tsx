"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { NEW_SET, NO_SET, SetPicker, type SetOption } from "@/components/set-picker";
import {
  emptyRow,
  filledRows,
  WordComposer,
  type ComposerRow,
} from "@/components/word-composer";
import { normalizeKey } from "@/lib/lexicon/key";

/**
 * Type words, choose where they go, add them.
 *
 * Everything happens on the button, in one pass and one order: translate what
 * has no translation, then save. Translating while someone is still typing was
 * the earlier design, and it was wrong in two ways — it spent the budget on
 * rows that were about to be deleted, and it filled the table with "…" at the
 * exact moment the person wanted to look at what they had written.
 */
export function AddWordsPanel({ onAdded }: { onAdded: () => void }) {
  const [rows, setRows] = useState<ComposerRow[]>([emptyRow()]);
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setValue, setSetValue] = useState<string>(NO_SET);
  const [newTitle, setNewTitle] = useState("");
  const [stage, setStage] = useState<"idle" | "translating" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/sets")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { sets?: SetOption[] } | null) => {
        if (!ignore) setSets(payload?.sets ?? []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const words = filledRows(rows);
  const busy = stage !== "idle";
  const needsName = setValue === NEW_SET && !newTitle.trim();

  /**
   * Fill the blanks. Rows arrive one at a time over NDJSON — hits from the
   * shared base first, then whatever the model answers — so the table fills in
   * while it works rather than after.
   */
  async function fillBlanks(missing: ComposerRow[]): Promise<Map<string, string>> {
    const answers = new Map<string, string>();
    const response = await fetch("/api/translate/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: missing.map((row) => row.front.trim()) }),
    });

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Could not translate these words.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let payload: { text?: string; translation?: string; error?: string };
        try {
          payload = JSON.parse(line);
        } catch {
          continue;
        }
        if (payload.error) throw new Error(payload.error);
        if (!payload.text || !payload.translation) continue;

        const key = normalizeKey(payload.text);
        const translation = payload.translation;
        answers.set(key, translation);
        // Functional, so a row that arrived two lines ago is not overwritten
        // by a stale copy of the table.
        setRows((current) =>
          current.map((row) =>
            normalizeKey(row.front) === key && !row.back.trim()
              ? { ...row, back: translation, filled: true }
              : row,
          ),
        );
      }
    }

    return answers;
  }

  async function submit() {
    setMessage(null);

    const snapshot = words;
    let answers = new Map<string, string>();

    const missing = snapshot.filter((row) => !row.back.trim());
    if (missing.length > 0) {
      setStage("translating");
      try {
        answers = await fillBlanks(missing);
      } catch (error) {
        setStage("idle");
        setMessage(
          error instanceof Error ? error.message : "Could not translate these words.",
        );
        return;
      }
    }

    setStage("saving");

    // The snapshot plus whatever the translation pass answered. The table is
    // disabled while this runs, so nothing else can have changed underneath.
    const complete = snapshot
      .map((row) => {
        const back = row.back.trim() || (answers.get(normalizeKey(row.front)) ?? "");
        return { ...row, back, filled: !row.back.trim() && Boolean(back) };
      })
      .filter((row) => row.back);
    if (complete.length === 0) {
      setStage("idle");
      setMessage("Nothing to add — every word still needs a translation.");
      return;
    }

    const response = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        words: complete.map((row) => ({
          front: row.front.trim(),
          back: row.back.trim(),
          // Typed by a person, not filled in by the model. The server offers
          // those to the shared base as candidates rather than as answers.
          typed: !row.filled,
        })),
        ...(setValue === NEW_SET
          ? { setTitle: newTitle.trim() }
          : setValue !== NO_SET
            ? { setId: setValue }
            : {}),
      }),
    }).catch(() => null);

    setStage("idle");

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

    setRows([emptyRow()]);
    setNewTitle("");
    if (result.setId && setValue === NEW_SET) {
      // The set exists now; keep it selected so the next batch lands with it.
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
      <WordComposer rows={rows} onChange={setRows} disabled={busy} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SetPicker
          sets={sets}
          value={setValue}
          newTitle={newTitle}
          onValueChange={setSetValue}
          onNewTitleChange={setNewTitle}
          disabled={busy}
        />
        <Button
          size="lg"
          onClick={submit}
          disabled={busy || words.length === 0 || needsName}
        >
          {stage === "translating"
            ? "Translating…"
            : stage === "saving"
              ? "Adding…"
              : words.length === 0
                ? "Add words"
                : `Add ${words.length} word${words.length === 1 ? "" : "s"}`}
        </Button>
      </div>

      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}
