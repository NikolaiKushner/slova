"use client";

import { useEffect, useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WordRating } from "@/components/word-rating";
import { DEFAULT_PAGE_SIZE } from "@/lib/words-query";
import type { Rating } from "@/lib/word-rating";

/**
 * Every word already added, twenty-five at a time.
 *
 * Paged on the server, so this component holds one page and nothing more —
 * the list is meant to keep working at five thousand words, and the way to
 * lose that is to fetch them all and slice in the browser.
 */

export type WordRow = {
  id: string;
  front: string;
  back: string;
  sets: { id: string; title: string }[];
  rating: Rating;
};

type Payload = {
  words: WordRow[];
  page: number;
  pages: number;
  total: number;
};

export function WordListTable() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  // The effect only subscribes; state changes happen in its callback or in the
  // handler that moved the page. Setting state in the body of an effect is what
  // makes a component render itself twice for one user action — three of those
  // got into this codebase once, and one was hiding a race.
  useEffect(() => {
    let ignore = false;

    fetch(`/api/words?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: Payload | null) => {
        if (ignore) return;
        setData(payload);
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page]);

  // Paging is a user action, so the wait it causes is set from the action.
  const goTo = (next: number) => {
    setPage(next);
    setLoading(true);
  };

  if (loading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nothing here yet. Words you add above will show up in this list.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>English</TableHead>
              <TableHead>Russian</TableHead>
              <TableHead>Set</TableHead>
              <TableHead className="w-24">Learned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.words.map((word) => (
              <TableRow key={word.id}>
                <TableCell className="font-medium">{word.front}</TableCell>
                <TableCell>{word.back}</TableCell>
                <TableCell>
                  {word.sets.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {word.sets.map((set) => (
                        <Badge key={set.id} variant="secondary">
                          {set.title}
                        </Badge>
                      ))}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <WordRating rating={word.rating} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data.pages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  goTo(Math.max(1, page - 1));
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>
                {page}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground px-2 text-sm">
                of {data.pages} · {data.total} words
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === data.pages}
                className={
                  page === data.pages ? "pointer-events-none opacity-50" : ""
                }
                onClick={(event) => {
                  event.preventDefault();
                  goTo(Math.min(data.pages, page + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
