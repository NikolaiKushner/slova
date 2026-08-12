"use client";

import { useState } from "react";
import { FolderInput, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  onFile: (setId: string, mode: "add" | "move") => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
}) {
  const [setId, setSetId] = useState("");

  if (count === 0) return null;

  return (
    <div className="bg-accent/40 flex flex-col gap-3 rounded-lg border px-3 py-2 sm:flex-row sm:items-center">
      <span className="text-sm">
        {count} {count === 1 ? "word" : "words"} selected
      </span>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {sets.length > 0 && (
          <>
            <Select
              value={setId}
              onValueChange={(next) => setSetId(next ?? "")}
              disabled={busy}
            >
              <SelectTrigger className="w-44" aria-label="Set to file into">
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
              onClick={() => onFile(setId, "add")}
            >
              <FolderInput className="size-4" />
              Add to set
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!setId || busy}
              onClick={() => onFile(setId, "move")}
            >
              Move here
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          // Muted until hover — never red at rest beside everything else.
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
