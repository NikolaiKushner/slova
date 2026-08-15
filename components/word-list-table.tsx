"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
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
import {
  WordBulkActions,
  type FilingDestination,
} from "@/components/word-bulk-actions";
import { COLUMN_LABEL } from "@/components/word-table";
import { paginationItems } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, nextSort, type SortField } from "@/lib/words-query";
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

const SORTABLE: SortField[] = ["word", "translation"];

export function WordListTable() {
  const t = useTranslations("dictionary");
  const common = useTranslations("common");
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
  }, [reload]);

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
    const next = nextSort(sort, dir, field);
    update(next);
  };

  const pageHref = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const queryString = next.toString();
    return queryString ? `?${queryString}` : "?";
  };

  const goToPage = (
    event: MouseEvent<HTMLAnchorElement>,
    target: number,
  ) => {
    event.preventDefault();
    if (target === page || target < 1 || target > (data?.pages ?? 1)) return;
    update({ page: String(target) });
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

  const fileInto = (
    destination: FilingDestination,
    mode: "add" | "remove",
  ) =>
    act(() =>
      fetch("/api/words", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, ...destination, mode }),
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
    <>
      <WordBulkActions
        count={selected.length}
        sets={sets}
        onFile={fileInto}
        onDelete={removeSelected}
        onClear={() => setSelected([])}
        busy={working}
      />
      <div className={cn("space-y-4", selected.length > 0 && "pb-24")}>
        <WordListFilters
          query={query}
          set={set}
          sets={sets}
          onQueryChange={(value) => update({ q: value })}
          onSetChange={(value) => update({ set: value })}
        />

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <p className="text-muted-foreground text-sm">
          {filtered ? t("nothingMatches") : t("nothingHere")}
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
                <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                  <TableHead className={cn("w-10", COLUMN_LABEL)}>
                    <Checkbox
                      checked={allTicked}
                      onCheckedChange={(value) =>
                        setSelected(value === true ? rows.map((word) => word.id) : [])
                      }
                      aria-label={t("selectPage")}
                    />
                  </TableHead>
                  {SORTABLE.map((field) => (
                    <TableHead key={field} className={COLUMN_LABEL}>
                      <SortButton
                        label={
                          field === "word"
                            ? common("english")
                            : common("russian")
                        }
                        active={sort === field}
                        dir={dir}
                        onClick={() => sortBy(field)}
                      />
                    </TableHead>
                  ))}
                  <TableHead className={COLUMN_LABEL}>{t("set")}</TableHead>
                  <TableHead className={cn("w-28", COLUMN_LABEL)}>
                    <SortButton
                      label={t("learned")}
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
                      href={pageHref(page - 1)}
                      aria-disabled={page === 1}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                      onClick={(event) => goToPage(event, page - 1)}
                    />
                  </PaginationItem>
                  {paginationItems(page, data.pages).map((item, index) =>
                    item === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href={pageHref(item)}
                          isActive={item === page}
                          onClick={(event) => goToPage(event, item)}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href={pageHref(page + 1)}
                      aria-disabled={page === data.pages}
                      className={
                        page === data.pages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                      onClick={(event) =>
                        goToPage(event, page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : (
              <span className="text-muted-foreground text-sm">
                {t("summaryWords", { count: data.total })}
              </span>
            )}

            <Select
              value={String(size)}
              onValueChange={(next) => update({ pageSize: next ?? "" })}
            >
              <SelectTrigger className="w-32" aria-label={t("wordsPerPage")}>
                <SelectValue>{t("perPage", { count: size })}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {t("perPage", { count: value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
    </>
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
  const t = useTranslations("dictionary");
  const Arrow = dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={
        !active
          ? t("sortBy", { label })
          : dir === "asc"
            ? t("sortDescending", { label })
            : t("clearSort", { label })
      }
      className={cn(
        COLUMN_LABEL,
        "-ml-2 h-auto cursor-pointer px-2 py-1 hover:bg-transparent hover:text-foreground",
      )}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </Button>
  );
}
