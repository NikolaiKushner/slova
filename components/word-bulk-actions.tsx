"use client";

import { useState } from "react";
import { FolderInput, FolderMinus, FolderPlus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import type { SetOption } from "@/components/set-picker";

/**
 * What to do with the rows that are ticked.
 *
 * A floating pill at the bottom of the screen, not a bar that swaps with the
 * filters: ticking a row should not move the table. Filing offers both "add"
 * and "move" because they are genuinely different intentions.
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
  onFile: (setId: string, mode: "add" | "move" | "remove") => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
  const [setId, setSetId] = useState("");
  const { state, isMobile } = useSidebar();

  if (count === 0) return null;

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

        {sets.length > 0 ? (
          <>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <Select
              value={setId}
              onValueChange={(next) => setSetId(next ?? "")}
              disabled={busy}
            >
              <SelectTrigger size="sm" className="w-36 sm:w-40" aria-label="Set">
                <SelectValue placeholder="Choose a set">
                  {sets.find((set) => set.id === setId)?.title ?? "Choose a set"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!setId || busy}
              onClick={() => onFile(setId, "move")}
            >
              <FolderInput className="size-4" />
              <span className="hidden sm:inline">Move here</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!setId || busy}
              onClick={() => onFile(setId, "add")}
            >
              <FolderPlus className="size-4" />
              <span className="hidden sm:inline">Also add</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!setId || busy}
              onClick={() => onFile(setId, "remove")}
            >
              <FolderMinus className="size-4" />
              <span className="hidden sm:inline">Take out</span>
            </Button>
          </>
        ) : null}

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
