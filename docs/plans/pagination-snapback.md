# Plan: pagination snaps back to page 1

**Date:** 2026-08-17 · **Branch:** `lexicon-expansion` · **Status:** implemented (needs the three clicks on `/dictionary`)
**Source:** screen recording 2026-08-17 14.12 — clicks on 2 and 20, rows stay
on page 1 (`young` … `terrible`)

## Problem

After step 2 of `three-fixes-table-and-cues.md`, the dictionary table no
longer changes page. The click lands — the number highlights — then the URL
and the rows snap back to page 1.

The rewrite effect in `word-list-table.tsx` compares the **live URL** with
the **last payload**. Clicking "2" updates the URL immediately; the last
payload is still page 1; the effect treats that as "the server clamped 2
down to 1" and writes the URL back.

## Outcome

Clicking 2, 20, next, or previous loads that page and stays there. A URL
that really is past the end still lands on the last page that exists.

## Success criteria

- [ ] Page 2 shows different rows from page 1 and stays there
- [ ] Page 20 (last) shows the last rows, not page 1
- [ ] `?page=99` still rewrites to the last real page
- [ ] Narrowing a filter from a deep page still lands on a page with rows

## Non-goals

- Not changing `clampPage` or the API — they already return the served page
- Not adding an e2e suite for pagination
- Not touching page size, sticky header, or the other two fixes

## Design

**Chosen: rewrite only when this response was clamped.** The fetch already
knows the page it asked for. Compare `payload.page` to that number in the
`.then`, and rewrite the URL only then. Delete the `useEffect` that watches
`data` and `page` together — that pairing is what sees a navigation as a
clamp.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| A (chosen) | Compare asked vs served in the fetch callback | One extra fetch after a real clamp, same as today | |
| B | Skip the effect while `loading` | Relies on `setLoading` and `useSearchParams` flushing in the same render | rejected: a missed flush reproduces the bug |
| C | Drop the client rewrite, trust the API | Pagination highlight and URL disagree until the next click | rejected: a reload would ask for the gone page again |

**What would change this decision:** if Next started exposing the in-flight
search params as a single atomic update with the payload, B would be enough.

**Touches:** UI (`components/word-list-table.tsx`) only.

## Steps

### 1. Move the rewrite onto the response — S · `[x]`

- **Why first:** this is the bug
- **Files:** `components/word-list-table.tsx` (edit)
- **Does:** in the words fetch `.then`, if `payload.page !== asked`,
  `router.replace` the served page (drop the param at 1). Remove the
  `useEffect` that calls `update` when `data.page !== page`.
- **Verify:** `/dictionary` — click 2, click 20, type `?page=99`. `npm test`
  still green (no new unit case: the decision is "which response", not new
  arithmetic; `clampPage` already covers the server).

## Risks

| Risk | Early signal | Cheapest way to resolve it now |
|---|---|---|
| Real clamp still loops | `?page=99` flickers | The second fetch asks for the served page, they agree, it stops |
| Quiet replace skips `setLoading` | Rows stale for one frame | Acceptable: they are already the clamped rows |

## Rollback

Revert the `word-list-table.tsx` hunk. No migration.

## Test plan

- Unit: existing `clampPage` tests — unchanged
- Manual: the three clicks above, on the running `npm run dev`
- Not testing: Playwright for pagination
