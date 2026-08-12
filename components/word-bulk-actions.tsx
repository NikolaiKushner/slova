"use client";

import { useState } from "react";
import { FolderInput, FolderMinus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SetOption } from "@/components/set-picker";

/**
 * What to do with the rows that are ticked.
 *
 * Appears only when something is selected, and says how many — a bar of
 * disabled buttons above an untouched table is furniture. Filing offers both
 * "add" and "move" because they are genuinely different intentions: a word can
 * belong to three lists, and guessing which one was meant would be wrong about
 * half the time.
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

  if (count === 0) return null;

  return (
    // One row, the same height as the filters it replaces, so the table below
    // does not jump when a tick goes in.
    <div className="flex h-9 items-center gap-2">
      <span className="text-sm whitespace-nowrap">
        {count} selected
      </span>

      <div className="flex flex-1 items-center gap-2">
        {sets.length > 0 && (
          <>
            <Select
              value={setId}
              onValueChange={(next) => setSetId(next ?? "")}
              disabled={busy}
            >
              <SelectTrigger size="sm" className="w-40" aria-label="Set">
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
              Move here
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!setId || busy}
              onClick={() => onFile(setId, "add")}
            >
              Also add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!setId || busy}
              onClick={() => onFile(setId, "remove")}
            >
              <FolderMinus className="size-4" />
              Take out
            </Button>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
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
            // Muted until hover — never red at rest beside everything else.
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </ConfirmDelete>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
