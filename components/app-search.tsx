"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Library, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchDeck = { id: string; title: string; cardCount: number };
type SearchCard = {
  id: string;
  front: string;
  back: string;
  deckId: string;
  deckTitle: string;
};

export function AppSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [decks, setDecks] = useState<SearchDeck[]>([]);
  const [cards, setCards] = useState<SearchCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDecks([]);
      setCards([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setDecks([]);
      setCards([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => null);
        if (res.ok) {
          setDecks(data.decks ?? []);
          setCards(data.cards ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(handle);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const empty = !loading && query.trim() && decks.length === 0 && cards.length === 0;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground [&_svg]:size-4 [&_svg]:stroke-[2]",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Search"
        title="Search (⌘K)"
      >
        <Search />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <DialogDescription className="sr-only">
              Search your lists and words
            </DialogDescription>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lists and words…"
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto p-2">
            {!query.trim() ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Type to find a list or word
                <span className="mt-1 block text-xs">⌘K anytime</span>
              </p>
            ) : null}

            {loading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            ) : null}

            {empty ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nothing found
              </p>
            ) : null}

            {decks.length > 0 ? (
              <div className="mb-2">
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Lists
                </p>
                <ul className="space-y-0.5">
                  {decks.map((deck) => (
                    <li key={deck.id}>
                      <button
                        type="button"
                        onClick={() => go(`/decks/${deck.id}`)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-hover"
                      >
                        <Library className="size-4 shrink-0 text-teal-800/80" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {deck.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {deck.cardCount}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {cards.length > 0 ? (
              <div>
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Words
                </p>
                <ul className="space-y-0.5">
                  {cards.map((card) => (
                    <li key={card.id}>
                      <button
                        type="button"
                        onClick={() => go(`/decks/${card.deckId}`)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-hover"
                      >
                        <BookOpen className="size-4 shrink-0 text-teal-800/80" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{card.front}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {card.back}
                          </span>
                        </span>
                        <span className="max-w-24 truncate text-xs text-muted-foreground">
                          {card.deckTitle}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
