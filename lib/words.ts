import { z } from "zod";

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
