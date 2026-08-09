"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type StudyCard = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  example: string | null;
};

type Props = {
  deckId?: string;
};

export function StudySession({ deckId }: Props) {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qs = deckId ? `?deckId=${encodeURIComponent(deckId)}` : "";
    fetch(`/api/study/queue${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards ?? []);
        setLoading(false);
        if (!data.cards?.length) setDone(true);
      })
      .catch(() => setLoading(false));
  }, [deckId]);

  const card = cards[index];

  async function rate(rating: "again" | "good") {
    if (!card || busy) return;
    setBusy(true);
    await fetch("/api/study/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, rating }),
    });
    setReviewed((n) => n + 1);
    setFlipped(false);
    setBusy(false);

    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading cards…</p>;
  }

  if (done || !card) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-display text-3xl tracking-tight">Nice work</h2>
        <p className="text-muted-foreground">
          Reviewed {reviewed} {reviewed === 1 ? "word" : "words"} this session.
        </p>
        <Link
          href="/home"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>{reviewed} done</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="study-card group relative flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm transition duration-300 hover:shadow-md"
      >
        <span className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">
          {flipped ? "Translation" : "Word"}
        </span>
        <span
          className={`font-display text-4xl leading-tight tracking-tight text-foreground transition duration-300 sm:text-5xl ${
            flipped ? "opacity-100" : "opacity-100"
          }`}
        >
          {flipped ? card.back : card.front}
        </span>
        {flipped && card.example ? (
          <p className="mt-4 text-sm text-muted-foreground">{card.example}</p>
        ) : null}
        <span className="mt-6 text-xs text-muted-foreground">
          Tap to {flipped ? "hide" : "reveal"}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={!flipped || busy}
          onClick={() => rate("again")}
        >
          Again
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!flipped || busy}
          onClick={() => rate("good")}
          className="bg-teal-800 text-white hover:bg-teal-900"
        >
          Know it
        </Button>
      </div>
    </div>
  );
}
