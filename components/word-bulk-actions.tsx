"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FolderMinus, FolderPlus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { NEW_SET, type SetOption } from "@/components/set-picker";

export type FilingDestination =
  | { setId: string; setTitle?: undefined }
  | { setTitle: string; setId?: undefined };

/**
 * What to do with the rows that are ticked.
 *
 * A floating pill at the bottom of the screen, not a bar that swaps with the
 * filters: ticking a row should not move the table. Filing is add or take
 * out: a word can belong to several lists, so joining one more and leaving
 * one are the two intentions. The picker can name a new set as well as pick
 * an existing one — that is how words that arrived with no category get one
 * later.
 */
export function WordBulkActions({
  count,
  sets,
  onFile,
  onDelete,
  onClear,
  busy,
}: {
  count: number;
  sets: SetOption[];
  onFile: (destination: FilingDestination, mode: "add" | "remove") => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
  const t = useTranslations("dictionary");
  const common = useTranslations("common");
  const [setId, setSetId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const { state, isMobile } = useSidebar();

  useEffect(() => {
    if (count === 0) {
      setSetId("");
      setNewTitle("");
    }
  }, [count]);

  if (count === 0) return null;

  const creating = setId === NEW_SET;
  const canFile = creating ? newTitle.trim().length > 0 : Boolean(setId);
  const selectedLabel = creating
    ? t("newSetEllipsis")
    : (sets.find((set) => set.id === setId)?.title ?? t("chooseSet"));

  const fileAdd = () => {
    if (creating) onFile({ setTitle: newTitle.trim() }, "add");
    else onFile({ setId }, "add");
  };

  const inset =
    isMobile
      ? "0px"
      : state === "collapsed"
        ? "var(--sidebar-width-icon)"
        : "var(--sidebar-width)";

  return (
    <div
      role="toolbar"
      aria-label={t("actionsAria")}
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        paddingLeft: isMobile ? undefined : `calc(${inset} + 1rem)`,
      }}
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/10">
        <span className="px-1 text-sm font-medium whitespace-nowrap">
          {t("selected", { count })}
        </span>

        <Separator orientation="vertical" className="max-sm:hidden" />
        <Select
          value={setId}
          onValueChange={(next) => {
            const value = next ?? "";
            setSetId(value);
            if (value !== NEW_SET) setNewTitle("");
          }}
          disabled={busy}
        >
          <SelectTrigger size="sm" className="w-36 sm:w-40" aria-label={t("set")}>
            <SelectValue placeholder={t("chooseSet")}>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sets.map((set) => (
              <SelectItem key={set.id} value={set.id}>
                {set.title}
              </SelectItem>
            ))}
            {sets.length > 0 ? <SelectSeparator /> : null}
            <SelectItem value={NEW_SET}>{t("newSetEllipsis")}</SelectItem>
          </SelectContent>
        </Select>

        {creating ? (
          <Input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canFile && !busy) fileAdd();
            }}
            placeholder={t("nameNewSet")}
            aria-label={t("newSetName")}
            disabled={busy}
            autoFocus
            className="h-7 w-36 sm:w-44"
          />
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canFile || busy}
          onClick={fileAdd}
        >
          <FolderPlus className="size-4" />
          <span className="hidden sm:inline">{t("alsoAdd")}</span>
        </Button>
        {creating ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!setId || busy}
            onClick={() => onFile({ setId }, "remove")}
          >
            <FolderMinus className="size-4" />
            <span className="hidden sm:inline">{t("takeOut")}</span>
          </Button>
        )}

        <Separator orientation="vertical" className="max-sm:hidden" />

        <ConfirmDelete
          title={t("deleteNTitle", { count })}
          description={t("deleteNBody")}
          onConfirm={onDelete}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">{common("delete")}</span>
          </Button>
        </ConfirmDelete>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label={t("clearSelection")}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
