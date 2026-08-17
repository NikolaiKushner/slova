export const MAX_SET_FILTERS = 50;
const MAX_OPAQUE_ID_LENGTH = 128;

export type RepeatedIdsResult =
  | { ok: true; ids: string[] }
  | { ok: false };

export function parseRepeatedSetIds(params: URLSearchParams): RepeatedIdsResult {
  const raw = params.getAll("set");
  if (raw.length > MAX_SET_FILTERS) return { ok: false };

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const id = value.trim();
    if (!id || id.length > MAX_OPAQUE_ID_LENGTH) return { ok: false };
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return { ok: true, ids };
}

export function parseOptionalSetId(value: string | null): RepeatedIdsResult {
  if (value === null) return { ok: true, ids: [] };
  const id = value.trim();
  if (!id || id.length > MAX_OPAQUE_ID_LENGTH) return { ok: false };
  return { ok: true, ids: [id] };
}
