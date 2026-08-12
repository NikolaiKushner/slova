"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SetOption } from "@/components/set-picker";
import { WordListFilters } from "@/components/word-list-filters";
import { WordListRow, type WordRow } from "@/components/word-list-row";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WordBulkActions } from "@/components/word-bulk-actions";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type SortField } from "@/lib/words-query";
import { cn } from "@/lib/utils";

/**
 * Every word already added, ten at a time unless asked otherwise.
 *
 * Searching, filtering, sorting and paging all happen in the database, and all
 * of them live in the URL. That is the difference between a filter and a view:
 * a link to "everything in Medical, least known first" is worth sending
 * yourself, and it survives a reload, the back button, and this component
 * being remounted after words are added.
 */

type Payload = {
  words: WordRow[];
  page: number;
  pages: number;
  total: number;
};

const SORTABLE: { field: SortField; label: string }[] = [
  { field: "word", label: "English" },
  { field: "translation", label: "Russian" },
];

export function WordListTable() {
  const router = useRouter();
  const params = useSearchParams();

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<SetOption[]>([]);
  // Selection is by id and survives nothing: a new page, a new filter and a
  // completed action all start it over, because a tick you cannot see is a
  // tick you did not mean.
  const [selected, setSelected] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  // Bumped after anything that changes a word. The URL cannot carry this: an
  // edit leaves the filters exactly as they were, so `replace` would write the
  // same address, no navigation would happen, and the table would keep showing
  // what is no longer there.
  const [reload, setReload] = useState(0);

  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const query = params.get("q") ?? "";
  const set = params.get("set") ?? "";
  const sort = (params.get("sort") ?? "added") as SortField;
  const size =
    PAGE_SIZES.find((value) => value === Number(params.get("pageSize"))) ??
    DEFAULT_PAGE_SIZE;
  const dir = params.get("dir") === "asc" ? "asc" : "desc";

  const search = params.toString();

  useEffect(() => {
    let ignore = false;

    const request = new URLSearchParams(search);
    request.set("pageSize", String(size));

    fetch(`/api/words?${request.toString()}`)
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
  }, [search, size, reload]);

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

  /**
   * Writes a filter into the URL. `replace` rather than `push`: narrowing a
   * list is not somewhere you should have to press Back through, and a
   * debounced search box would otherwise leave a history entry per word typed.
   */
  const update = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      // Changing what is shown puts you back at the start of it — page 4 of a
      // different list is not a place anyone meant to be.
      if (!("page" in changes)) next.delete("page");

      setLoading(true);
      setSelected([]);
      router.replace(next.toString() ? `?${next.toString()}` : "?", {
        scroll: false,
      });
    },
    [params, router],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    setReload((value) => value + 1);
  }, []);

  const sortBy = (field: SortField) => {
    // Clicking the column you are already sorted by turns it around.
    const nextDir = sort === field && dir === "asc" ? "desc" : "asc";
    update({ sort: field, dir: nextDir });
  };

  const filtered = Boolean(query || set);
  const rows = data?.words ?? [];
  const allTicked = rows.length > 0 && selected.length === rows.length;

  async function act(run: () => Promise<Response | null>) {
    setWorking(true);
    const response = await run().catch(() => null);
    setWorking(false);
    if (!response?.ok) return;
    setSelected([]);
    refresh();
  }

  const fileInto = (setId: string, mode: "add" | "move" | "remove") =>
    act(() =>
      fetch("/api/words", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, setId, mode }),
      }),
    );

  const removeSelected = () =>
    act(() =>
      fetch("/api/words", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      }),
    );

  return (
    <div className="space-y-4">
      {/* One row either way: filters when nothing is ticked, actions when
          something is. Stacking them would move the table under the cursor at
          the moment a tick goes in. */}
      {selected.length === 0 ? (
        <WordListFilters
          query={query}
          set={set}
          sets={sets}
          onQueryChange={(value) => update({ q: value })}
          onSetChange={(value) => update({ set: value })}
        />
      ) : (
        <WordBulkActions
          count={selected.length}
          sets={sets}
          onFile={fileInto}
          onDelete={removeSelected}
          onClear={() => setSelected([])}
          busy={working}
        />
      )}

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <p className="text-muted-foreground text-sm">
          {filtered
            ? "Nothing matches that. Try another word, or clear the filter."
            : "Nothing here yet. Words you add above will show up in this list."}
        </p>
      ) : (
        <>
          <div
            className={cn(
              "bg-card overflow-hidden rounded-lg border transition-opacity",
              // Dimmed rather than replaced: swapping ten rows for ten
              // skeletons is the same information and a jump.
              loading && "pointer-events-none opacity-60",
            )}
            aria-busy={loading}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allTicked}
                      onCheckedChange={(value) =>
                        setSelected(value === true ? rows.map((word) => word.id) : [])
                      }
                      aria-label="Select every word on this page"
                    />
                  </TableHead>
                  {SORTABLE.map((column) => (
                    <TableHead key={column.field}>
                      <SortButton
                        label={column.label}
                        active={sort === column.field}
                        dir={dir}
                        onClick={() => sortBy(column.field)}
                      />
                    </TableHead>
                  ))}
                  <TableHead>Set</TableHead>
                  <TableHead className="w-28">
                    <SortButton
                      label="Learned"
                      active={sort === "rating"}
                      dir={dir}
                      onClick={() => sortBy("rating")}
                    />
                  </TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((word) => (
                  <WordListRow
                    key={word.id}
                    word={word}
                    selected={selected.includes(word.id)}
                    onSelect={(on) =>
                      setSelected((current) =>
                        on
                          ? [...current, word.id]
                          : current.filter((id) => id !== word.id),
                      )
                    }
                    onChanged={refresh}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {data.pages > 1 ? (
              <Pagination className="mx-0 w-auto justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page === 1}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      update({ page: String(Math.max(1, page - 1)) });
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    isActive
                    onClick={(event) => event.preventDefault()}
                  >
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
                      update({ page: String(Math.min(data.pages, page + 1)) });
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            ) : (
              <span className="text-muted-foreground text-sm">
                {data.total} {data.total === 1 ? "word" : "words"}
              </span>
            )}

            <Select
              value={String(size)}
              onValueChange={(next) => update({ pageSize: next ?? "" })}
            >
              <SelectTrigger className="w-32" aria-label="Words per page">
                <SelectValue>{size} per page</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

/** A column heading that sorts. The arrow shows only on the active one. */
function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  const Arrow = dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={`Sort by ${label}`}
      className={cn(
        "-ml-2 h-auto px-2 py-1 font-medium",
        !active && "text-muted-foreground",
      )}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </Button>
  );
}
