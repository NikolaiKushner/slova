"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseImportText } from "@/lib/parse-import";

type Props = {
  deckId?: string;
};

export function ImportForm({ deckId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = parseImportText(text);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let targetDeckId = deckId;

      if (!targetDeckId) {
        if (!title.trim()) {
          setError("Give the list a title");
          setLoading(false);
          return;
        }
        const createRes = await fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() }),
        });
        if (!createRes.ok) {
          const data = await createRes.json().catch(() => null);
          throw new Error(data?.error ?? "Could not create deck");
        }
        const { deck } = await createRes.json();
        targetDeckId = deck.id;
      }

      const importRes = await fetch(`/api/decks/${targetDeckId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: "paste" }),
      });

      if (!importRes.ok) {
        const data = await importRes.json().catch(() => null);
        throw new Error(data?.error ?? "Import failed");
      }

      router.push(`/decks/${targetDeckId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!deckId ? (
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

      <div className="space-y-2">
        <Label htmlFor="text">Paste words</Label>
        <Textarea
          id="text"
          className="min-h-48 font-mono text-sm"
          placeholder={"hello — привет\nthanks\tспасибо\nplease, пожалуйста"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          One pair per line: <code>word — translation</code>, tab, or comma.
        </p>
      </div>

      {text.trim() ? (
        <div className="rounded-xl border border-border bg-white/70 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Preview: {preview.cards.length} cards
            {preview.skipped ? `, ${preview.skipped} skipped` : ""}
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-muted-foreground">
            {preview.cards.slice(0, 8).map((card, i) => (
              <li key={`${card.front}-${i}`}>
                <span className="text-foreground">{card.front}</span>
                {" → "}
                {card.back}
              </li>
            ))}
            {preview.cards.length > 8 ? (
              <li>…and {preview.cards.length - 8} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={loading || preview.cards.length === 0} size="lg">
        {loading ? "Importing…" : "Import & open"}
      </Button>
    </form>
  );
}
