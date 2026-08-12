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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { WordListRow, type WordRow } from "@/components/word-list-row";
import { DEFAULT_PAGE_SIZE } from "@/lib/words-query";

/**
 * Every word already added, twenty-five at a time.
 *
 * Paged on the server, so this component holds one page and nothing more —
 * the list is meant to keep working at five thousand words, and the way to
 * lose that is to fetch them all and slice in the browser.
 */

type Payload = {
  words: WordRow[];
  page: number;
  pages: number;
  total: number;
};

export function WordListTable() {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
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
  }, [page, reload]);

  // Paging is a user action, so the wait it causes is set from the action.
  const goTo = (next: number) => {
    setPage(next);
    setLoading(true);
  };

  // After an edit or a delete, re-read the page rather than patching a copy of
  // it in the browser: a deleted row changes what the page even contains.
  const refresh = () => setReload((value) => value + 1);

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
      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>English</TableHead>
              <TableHead>Russian</TableHead>
              <TableHead>Set</TableHead>
              <TableHead className="w-24">Learned</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.words.map((word) => (
              <WordListRow key={word.id} word={word} onChanged={refresh} />
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
