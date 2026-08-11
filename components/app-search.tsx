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

type SearchSet = { id: string; title: string; wordCount: number };
type SearchWord = {
  id: string;
  front: string;
  back: string;
  /** A word can belong to no set at all; then there is nowhere to jump yet. */
  setId: string | null;
  setTitle: string | null;
};

export function AppSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sets, setSets] = useState<SearchSet[]>([]);
  const [words, setWords] = useState<SearchWord[]>([]);
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

  /** Closing throws the search away, so reopening never flashes the last one. */
  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setSets([]);
      setWords([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!open || !q) return;

    // A slow response for "wor" must not land after a fast one for "word".
    let ignore = false;

    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => null);
        if (!ignore && res.ok) {
          setSets(data.sets ?? []);
          setWords(data.words ?? []);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 200);

    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  // Derived rather than cleared in an effect: an empty box shows nothing on the
  // same render the box is emptied, instead of one render later.
  const trimmed = query.trim();
  const shownSets = trimmed ? sets : [];
  const shownWords = trimmed ? words : [];
  const empty =
    !loading && trimmed && shownSets.length === 0 && shownWords.length === 0;

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
        onClick={() => onOpenChange(true)}
        aria-label="Search"
        title="Search (⌘K)"
      >
        <Search />
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <DialogDescription className="sr-only">
              Search your sets and words
            </DialogDescription>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sets and words…"
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto p-2">
            {!trimmed ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Type to find a set or word
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

            {shownSets.length > 0 ? (
              <div className="mb-2">
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Sets
                </p>
                <ul className="space-y-0.5">
                  {shownSets.map((set) => (
                    <li key={set.id}>
                      <button
                        type="button"
                        onClick={() => go(`/dictionary/sets/${set.id}`)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-hover"
                      >
                        <Library className="size-4 shrink-0 text-teal-800/80" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {set.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {set.wordCount}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {shownWords.length > 0 ? (
              <div>
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Words
                </p>
                <ul className="space-y-0.5">
                  {shownWords.map((word) => (
                    <li key={word.id}>
                      <button
                        type="button"
                        onClick={() =>
                          go(
                            word.setId
                              ? `/dictionary/sets/${word.setId}`
                              : "/dictionary",
                          )
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-hover"
                      >
                        <BookOpen className="size-4 shrink-0 text-teal-800/80" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{word.front}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {word.back}
                          </span>
                        </span>
                        <span className="max-w-24 truncate text-xs text-muted-foreground">
                          {word.setTitle}
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
