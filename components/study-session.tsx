"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIGNED_IN_HOME } from "@/lib/auth.config";
import { useStudySitting } from "@/hooks/use-study-sitting";

type StudyWord = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  example: string | null;
};

type Props = {
  setId?: string;
};

export function StudySession({ setId }: Props) {
  const t = useTranslations("study");
  const common = useTranslations("common");
  const [words, setWords] = useState<StudyWord[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);
  /** Exact review operations from this session, most recent last. */
  const [history, setHistory] = useState<
    { index: number; operationId: string }[]
  >([]);

  useEffect(() => {
    const qs = setId ? `?setId=${encodeURIComponent(setId)}` : "";
    fetch(`/api/study/queue${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setWords(data.words ?? []);
        setLoading(false);
        if (!data.words?.length) setDone(true);
      })
      .catch(() => setLoading(false));
  }, [setId]);

  const word = words[index];

  const { getIdAsync, elapsedMs, complete } = useStudySitting({
    active: !loading && words.length > 0,
    kind: "study",
    label: "study",
    sourceState: "due",
    setIds: setId ? [setId] : [],
    cardKey: word?.id ?? null,
  });

  const rate = useCallback(
    async (rating: "again" | "good") => {
      const current = words[index];
      if (!current || busy) return;

      setBusy(true);
      const sittingId = await getIdAsync();
      const operationId = crypto.randomUUID();
      await fetch("/api/study/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: current.id,
          operationId,
          rating,
          sittingId: sittingId ?? undefined,
          kind: "study",
          elapsedMs: elapsedMs(),
        }),
      });
      setReviewed((n) => n + 1);
      setHistory((h) => [...h, { index, operationId }]);
      setFlipped(false);
      setBusy(false);

      if (index + 1 >= words.length) {
        void complete();
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [busy, words, index, getIdAsync, elapsedMs, complete],
  );

  /** Step back onto the last rated card and restore what the rating changed. */
  const undo = useCallback(async () => {
    const previous = history[history.length - 1];
    if (!previous || busy) return;

    const target = words[previous.index];
    if (!target) return;

    setBusy(true);
    const res = await fetch("/api/study/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationId: previous.operationId }),
    });
    setBusy(false);
    if (!res.ok) return;

    setHistory((h) => h.slice(0, -1));
    setReviewed((n) => Math.max(0, n - 1));
    setIndex(previous.index);
    setFlipped(true);
    setDone(false);
  }, [busy, words, history]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const key = event.key.toLowerCase();

      if (key === "z" || event.key === "Backspace") {
        event.preventDefault();
        void undo();
        return;
      }

      if (done || !words[index]) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((f) => !f);
        return;
      }

      if (!flipped) return;

      if (key === "1") {
        event.preventDefault();
        void rate("again");
      } else if (key === "2") {
        event.preventDefault();
        void rate("good");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [words, done, flipped, index, rate, undo]);

  if (loading) {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }

  if (done || !word) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-display text-3xl tracking-tight">{t("niceWork")}</h2>
        <p className="text-muted-foreground">
          {t("reviewedSession", { count: reviewed })}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={SIGNED_IN_HOME}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            {t("backHome")}
          </Link>
          {history.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={busy}
              onClick={undo}
            >
              <Undo2 />
              {t("undoLast")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {words.length}
        </span>
        <span>{t("doneCount", { count: reviewed })}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="study-card group relative flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm transition duration-300 hover:shadow-md"
      >
        <span className="text-overline text-eyebrow mb-3">
          {flipped ? common("translation") : common("word")}
        </span>
        <span className="font-display text-4xl leading-tight tracking-tight text-foreground transition duration-300 sm:text-5xl">
          {flipped ? word.back : word.front}
        </span>
        {flipped && word.example ? (
          <p className="mt-4 text-sm text-muted-foreground">{word.example}</p>
        ) : null}
        <span className="mt-6 text-xs text-muted-foreground">
          {flipped ? t("tapHide") : t("tapReveal")}
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
          {t("again")}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!flipped || busy}
          onClick={() => rate("good")}
        >
          {t("knowIt")}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || history.length === 0}
          onClick={undo}
        >
          <Undo2 />
          {common("undo")}
        </Button>
        <span className="hidden sm:block">{t("shortcuts")}</span>
      </div>
    </div>
  );
}
