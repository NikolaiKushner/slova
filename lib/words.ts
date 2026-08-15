import { z } from "zod";

export const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

/**
 * File several words into a set. `setId` is one that already exists; `setTitle`
 * names one to create (or reuse, if that title is already in the list). The
 * two together are a contradiction. `remove` only makes sense for a set that
 * already exists — there is nothing to leave yet.
 */
export const filingSchema = bulkIdsSchema
  .extend({
    setId: z.string().min(1).optional(),
    setTitle: z.string().trim().min(1).max(120).optional(),
    /**
     * `move` makes this set their only one, `add` files them under one more,
     * and `remove` takes them out of this one and leaves the rest.
     */
    mode: z.enum(["add", "move", "remove"]).default("move"),
  })
  .superRefine((value, ctx) => {
    if (value.setId && value.setTitle) {
      ctx.addIssue({
        code: "custom",
        message: "Choose an existing set or name a new one, not both.",
      });
    }
    if (!value.setId && !value.setTitle) {
      ctx.addIssue({
        code: "custom",
        message: "Which words, and where?",
      });
    }
    if (value.mode === "remove" && !value.setId) {
      ctx.addIssue({
        code: "custom",
        message: "Take out needs an existing set.",
      });
    }
  });

/**
 * Partial word edit. Every field is optional so a caller can touch just one
 * (the word row edits front/back; study may later add a note). Strings are
 * trimmed before validation, so whitespace-only front/back is rejected.
 */
export const wordUpdateSchema = z
  .object({
    front: z.string().trim().min(1).max(500).optional(),
    back: z.string().trim().min(1).max(2000).optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    example: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: "Nothing to update",
  });

export type WordUpdate = z.infer<typeof wordUpdateSchema>;

export type WordUpdateData = {
  front?: string;
  back?: string;
  note?: string | null;
  example?: string | null;
};

/** Drop untouched fields; a cleared note or example becomes null, not "". */
export function toWordUpdateData(input: WordUpdate): WordUpdateData {
  const data: WordUpdateData = {};
  if (input.front !== undefined) data.front = input.front;
  if (input.back !== undefined) data.back = input.back;
  if (input.note !== undefined) data.note = input.note || null;
  if (input.example !== undefined) data.example = input.example || null;
  return data;
}
