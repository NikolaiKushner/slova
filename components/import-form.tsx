"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WORD_GRID, WordTable } from "@/components/word-table";
import { cn } from "@/lib/utils";
import { parseImportText } from "@/lib/parse-import";
import { looksTransliterated, matchCase, normalizeRow } from "@/lib/normalize";
import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";

type Row = {
  id: string;
  front: string;
  back: string;
  status?: "idle" | "loading" | "error";
  error?: string;
};

type Props = {
  setId?: string;
};

function newId() {
  return crypto.randomUUID();
}

function emptyRow(): Row {
  return { id: newId(), front: "", back: "", status: "idle" };
}

function ensureTrailingEmpty(rows: Row[]): Row[] {
  const last = rows[rows.length - 1];
  if (!last || last.front.trim() || last.back.trim()) {
    return [...rows, emptyRow()];
  }
  return rows;
}

export function ImportForm({ setId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(true);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  const completeCards = useMemo(
    () =>
      rows
        .map((r) => ({ front: r.front.trim(), back: r.back.trim() }))
        .filter((r) => r.front && r.back),
    [rows],
  );

  const emptyBackCount = useMemo(
    () => rows.filter((r) => r.front.trim() && !r.back.trim()).length,
    [rows],
  );

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      ensureTrailingEmpty(
        prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      ),
    );
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return ensureTrailingEmpty(next.length ? next : [emptyRow()]);
    });
  }

  function applyPaste() {
    const { cards } = parseImportText(paste);
    if (cards.length === 0) {
      setError("Nothing to paste. Add words, one per line.");
      return;
    }
    setError(null);
    setRows(
      ensureTrailingEmpty(
        cards.map((c) => {
          const clean = normalizeRow(c.front, c.back);
          return {
            id: newId(),
            front: clean.front,
            back: clean.back,
            status: "idle" as const,
          };
        }),
      ),
    );
    setShowPaste(false);
    setPaste("");
  }

  async function translateEmpty() {
    const targets = rows.filter((r) => r.front.trim() && !r.back.trim());
    if (targets.length === 0) return;

    setTranslating(true);
    setError(null);
    setRows((prev) =>
      prev.map((r) =>
        targets.some((t) => t.id === r.id)
          ? { ...r, status: "loading", error: undefined }
          : r,
      ),
    );

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: targets.map((t) => t.front.trim()),
          from: STUDY_SOURCE_LANG,
          to: STUDY_TARGET_LANG,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Translate failed");
      }

      const byText = new Map<
        string,
        { translation: string | null; error?: string }
      >();
      for (const item of data.results ?? []) {
        byText.set(item.text, item);
      }

      setRows((prev) =>
        ensureTrailingEmpty(
          prev.map((row) => {
            if (!targets.some((t) => t.id === row.id)) return row;
            const hit = byText.get(row.front.trim());
            if (!hit?.translation) {
              return {
                ...row,
                status: "error",
                error: hit?.error ?? "Failed",
              };
            }
            const back = matchCase(
              row.front.trim(),
              normalizeRow(row.front, hit.translation).back,
            );
            if (looksTransliterated(back)) {
              // A transliteration reads like an answer and teaches nothing —
              // leave the cell empty rather than import it.
              return {
                ...row,
                back: "",
                status: "error",
                error: "Came back transliterated — type it yourself",
              };
            }
            return {
              ...row,
              back,
              status: "idle",
              error: undefined,
            };
          }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translate failed");
      setRows((prev) =>
        prev.map((r) =>
          r.status === "loading" ? { ...r, status: "error" } : r,
        ),
      );
    } finally {
      setTranslating(false);
    }
  }

  async function translateOne(row: Row) {
    if (!row.front.trim()) return;
    updateRow(row.id, { status: "loading", error: undefined });
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: row.front.trim(),
          from: STUDY_SOURCE_LANG,
          to: STUDY_TARGET_LANG,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Translate failed");
      const back = matchCase(
        row.front.trim(),
        normalizeRow(row.front, data.translation).back,
      );
      if (looksTransliterated(back)) {
        updateRow(row.id, {
          status: "error",
          error: "Came back transliterated — type it yourself",
        });
        return;
      }
      updateRow(row.id, { back, status: "idle", error: undefined });
    } catch (err) {
      updateRow(row.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (completeCards.length === 0) {
      setError("Add at least one word with a translation");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetSetId = setId;

      if (!targetSetId) {
        if (!title.trim()) {
          setError("Give the set a title");
          setLoading(false);
          return;
        }
        const createRes = await fetch("/api/sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            sourceLang: STUDY_SOURCE_LANG,
            targetLang: STUDY_TARGET_LANG,
          }),
        });
        if (!createRes.ok) {
          const data = await createRes.json().catch(() => null);
          throw new Error(data?.error ?? "Could not create set");
        }
        const { set } = await createRes.json();
        targetSetId = set.id;
      }

      const importRes = await fetch(`/api/sets/${targetSetId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: completeCards, source: "import" }),
      });

      if (!importRes.ok) {
        const data = await importRes.json().catch(() => null);
        throw new Error(data?.error ?? "Import failed");
      }

      router.push(`/dictionary/sets/${targetSetId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {!setId ? (
        <div className="space-y-2">
          <Label htmlFor="title">List title</Label>
          <Input
            id="title"
            placeholder="Tutor week 3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
      ) : null}

      {showPaste ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="paste">Paste a list</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPaste(false)}
            >
              Type in table instead
            </Button>
          </div>
          <Textarea
            id="paste"
            className="min-h-32 font-mono text-sm"
            placeholder={"apple\nhello — привет\nthanks\tспасибо"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            One English word per line, or a pair split by <code>—</code>, tab
            or comma. Missing Russian can be auto-filled.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!paste.trim()}
            onClick={applyPaste}
          >
            Load into table
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPaste(true)}
        >
          <Plus />
          Paste a list
        </Button>
      )}

      <div className="space-y-3">
        <div className="flex min-h-8 items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {completeCards.length} ready
            {emptyBackCount ? ` · ${emptyBackCount} need translation` : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={translating || emptyBackCount === 0}
            onClick={translateEmpty}
          >
            {translating ? "Translating…" : "Translate empty"}
          </Button>
        </div>

        <WordTable>
          <ul className="divide-y divide-border">
            {rows.map((row, index) => {
              const isLast = index === rows.length - 1;
              const canRemove =
                !isLast || row.front.trim() || row.back.trim() || rows.length > 1;
              return (
                <li key={row.id} className={cn(WORD_GRID, "px-3 py-2")}>
                  <Input
                    aria-label={`English word ${index + 1}`}
                    placeholder={isLast ? "Type or paste…" : "English"}
                    value={row.front}
                    onChange={(e) =>
                      updateRow(row.id, { front: e.target.value, status: "idle" })
                    }
                    className="border-transparent bg-transparent shadow-none focus-visible:border-border focus-visible:bg-white"
                  />
                  <div className="space-y-1">
                    <Input
                      aria-label={`Russian translation ${index + 1}`}
                      placeholder="Russian"
                      value={row.back}
                      onChange={(e) =>
                        updateRow(row.id, { back: e.target.value, status: "idle" })
                      }
                      className="border-transparent bg-transparent shadow-none focus-visible:border-border focus-visible:bg-white"
                    />
                    {row.status === "error" && row.error ? (
                      <p className="px-1 text-xs text-destructive">{row.error}</p>
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-1">
                    {row.front.trim() && !row.back.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={row.status === "loading"}
                        onClick={() => translateOne(row)}
                      >
                        {row.status === "loading" ? "…" : "Fill"}
                      </Button>
                    ) : null}
                    {canRemove && (row.front || row.back || !isLast) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove row"
                      >
                        <X />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </WordTable>
        <p className="text-xs text-muted-foreground">
          Auto-translate uses MyMemory (free). Always review before importing.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        disabled={loading || completeCards.length === 0}
        size="lg"
        className="bg-teal-800 text-white hover:bg-teal-900"
      >
        {loading
          ? "Importing…"
          : `Import ${completeCards.length || ""} ${completeCards.length === 1 ? "card" : "cards"}`.trim()}
      </Button>
    </form>
  );
}
