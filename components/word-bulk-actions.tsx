"use client";

import { useEffect, useState } from "react";
import { FolderInput, FolderMinus, FolderPlus, Trash2, X } from "lucide-react";

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
 * filters: ticking a row should not move the table. Filing offers both "add"
 * and "move" because they are genuinely different intentions. The picker can
 * name a new set as well as pick an existing one — that is how words that
 * arrived with no category get one later, and **Move here** is the usual way.
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
  onFile: (destination: FilingDestination, mode: "add" | "move" | "remove") => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
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
    ? "New set…"
    : (sets.find((set) => set.id === setId)?.title ?? "Choose a set");

  const file = (mode: "add" | "move") => {
    if (creating) onFile({ setTitle: newTitle.trim() }, mode);
    else onFile({ setId }, mode);
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
      aria-label="Actions for selected words"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        paddingLeft: isMobile ? undefined : `calc(${inset} + 1rem)`,
      }}
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/10">
        <span className="px-1 text-sm font-medium whitespace-nowrap">
          {count} selected
        </span>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <Select
          value={setId}
          onValueChange={(next) => {
            const value = next ?? "";
            setSetId(value);
            if (value !== NEW_SET) setNewTitle("");
          }}
          disabled={busy}
        >
          <SelectTrigger size="sm" className="w-36 sm:w-40" aria-label="Set">
            <SelectValue placeholder="Choose a set">{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sets.map((set) => (
              <SelectItem key={set.id} value={set.id}>
                {set.title}
              </SelectItem>
            ))}
            {sets.length > 0 ? <SelectSeparator /> : null}
            <SelectItem value={NEW_SET}>New set…</SelectItem>
          </SelectContent>
        </Select>

        {creating ? (
          <Input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canFile && !busy) file("move");
            }}
            placeholder="Name the new set"
            aria-label="New set name"
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
          onClick={() => file("move")}
        >
          <FolderInput className="size-4" />
          <span className="hidden sm:inline">Move here</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canFile || busy}
          onClick={() => file("add")}
        >
          <FolderPlus className="size-4" />
          <span className="hidden sm:inline">Also add</span>
        </Button>
        {creating ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!setId || busy}
            onClick={() => onFile({ setId }, "remove")}
          >
            <FolderMinus className="size-4" />
            <span className="hidden sm:inline">Take out</span>
          </Button>
        )}

        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        <ConfirmDelete
          title={`Delete ${count} ${count === 1 ? "word" : "words"}?`}
          description="They leave the dictionary along with everything the scheduler had learned about them. Taking them out of a set instead keeps the words."
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
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </ConfirmDelete>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
