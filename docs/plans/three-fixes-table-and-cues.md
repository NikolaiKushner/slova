# Plan: the words table, the missing form cue, and the doubled counter

**Date:** 2026-08-17 · **Branch:** `lexicon-expansion` · **Status:** in progress (steps 1–4 done, tests green; step 5 is the three screens)
**Source:** three annotated screenshots from the owner (dictionary table,
lesson gap question, lesson top bar)

## Problem

Three unrelated defects, one per screen.

1. **The words table has no ceiling and the wrong default page.** 198 words at
   ten per page is twenty pages; the table itself grows as tall as its rows, so
   the header scrolls away and the pagination sits below the fold. And when the
   last page is emptied — by deleting the words on it, or by narrowing the
   filter — the URL keeps pointing at a page that no longer exists, the API
   answers with zero rows, and the table goes blank while the words are still
   there.
2. **A typed gap question does not say which word to inflect.**
   `I ___ football.` with the input placeholder "Type the form" is
   unanswerable. The dictionary form is in the content (`(do not play)`), but
   `typedPlaceholderHint` in `lib/courses/prompt.ts` deliberately drops it when
   it matches an accepted answer — and that is exactly this item. So the cue
   disappears precisely where it is needed. Also, a placeholder is the wrong
   place for it: a placeholder reads as the thing to type.
3. **The progress count is printed twice.** `FocusTopBar` renders
   `LinearProgress` with the label "3 of 10" under the bar, and `FocusHead`
   prints "question 3 of 10" directly under the task line. §15.2 of the design
   system asks for progress in the top bar; the head is meant to be the task.

## Outcome

The dictionary table is a fixed-height pane with a pinned header, twenty-five
rows by default and a hundred available; a page that stops existing sends you
to the last one that does, whichever way it stopped existing. A typed gap
question always shows the word being inflected, near the prompt and not inside
the box. Where you are in a session is printed once.

## Success criteria

- [ ] The words table scrolls inside itself, header pinned, pagination always
      reachable without scrolling the page
- [ ] Default page size is 25; the control offers 10 / 25 / 50 / 100
- [ ] Deleting every word on the last page lands on the new last page with rows
      on it, and the URL agrees
- [ ] Narrowing the filter from page 7 does the same
- [ ] Changing page or filter resets the table's own scroll to the top
- [ ] Every typed gap question shows its dictionary-form cue on screen; no cue
      lives in a placeholder
- [ ] `I ___ football.` reads as a negative-form task and shows `play`
- [ ] The step count appears once per session screen
- [ ] `npm test` green; the three screens checked in a browser

## Non-goals

- Not merging to `main` — this batch stays on `lexicon-expansion` (`CLAUDE.md`)
- Not touching brainstorm's head count: its top bar is a `StageRail` with no
  numbers, so that line is the only count there
- Not rewriting the 68 gap prompts whose trailing `(hint)` already works
- Not adding a hint/skip affordance to gap questions — a cue is not a hint

---

## Step 1 — the words table: height, header, page sizes

`components/word-list-table.tsx`, `components/ui/table.tsx`,
`lib/words-query.ts`.

1. `lib/words-query.ts`: `DEFAULT_PAGE_SIZE` 10 → **25**, `PAGE_SIZES`
   `[10, 25, 50]` → `[10, 25, 50, 100]`. `MAX_PAGE_SIZE` is already 100, so the
   clamp needs no change. Update the comment — the old one justifies ten.
2. `components/ui/table.tsx`: give `Table` an optional `containerClassName`
   that lands on the existing `table-container` div. The container is the only
   element that can own the scroll: it already carries `overflow-x-auto`, and
   nesting a second scroller inside it is what breaks `position: sticky` for
   the header.
3. `word-list-table.tsx`: pass
   `containerClassName="max-h-[65vh] overflow-y-auto overscroll-contain"`
   (§14 asks for `overscroll-behavior: contain` on scrolling panels; the exact
   ceiling gets settled in the browser, not here).
4. Pin the header: `sticky top-0 z-10` on the header row with an **opaque**
   `bg-muted` instead of today's `bg-muted/50` — a translucent header shows the
   rows sliding under it — and keep the bottom border on the cells, since a
   border on a sticky `tr` does not travel.
5. Reset the pane's scroll on every change of page or filter: a ref on the
   container, `scrollTop = 0` when `search` changes. Landing mid-list after
   pressing "2" is the same bug as landing on an empty page.

Tests: `tests/unit/words-query.test.ts` asserts `DEFAULT_PAGE_SIZE` — update it
and add the new page size to whatever asserts `PAGE_SIZES`.

## Step 2 — a page that no longer exists

`lib/words-query.ts`, `app/api/words/route.ts`, `components/word-list-table.tsx`.

The fix belongs on the server: the client cannot know the last page until it
has asked, and the request it makes is already the one that could answer
correctly.

1. `lib/words-query.ts`: add `clampPage(page, total, pageSize)` returning
   `Math.min(Math.max(page, 1), pageCount(total, pageSize))`. Pure, tested next
   to `pageCount`.
2. `app/api/words/route.ts`: today `count` and `findMany` run in parallel and
   `skip` uses the unclamped page. Count first, clamp, then query with the
   clamped skip, and return the clamped `page`. One extra round trip in
   exchange for never answering with an empty page of a non-empty result.
3. `word-list-table.tsx`: when the payload comes back with a `page` that is not
   the one in the URL, rewrite the URL to it (`update({ page })`, dropping the
   param at 1). Without this the rows are right but the pagination highlights a
   page that is gone, and a reload would ask for it again. The rewrite settles
   in one pass: the second response agrees with the URL.

This covers the filter case too — the existing `update` already drops `page`
when a filter changes, but a refresh after a delete, a back/forward step, or a
hand-typed `?page=20` all arrive at the same clamp.

Tests: `clampPage` in `tests/unit/words-query.test.ts` — past the end, before
the start, empty result, exact boundary.

## Step 3 — the form cue in a gap question

`content/courses/schema.ts`, `lib/courses/prompt.ts`,
`components/courses/exercise-view.tsx`, `components/courses/lesson-player.tsx`,
`messages/{en,ru}.json`, seven content items.

The convention in the content is already uniform: a trailing `(word)` is the
dictionary form (`She ___ to work at eight. (go)`). Seven items break it by
putting a fully inflected answer there — `(do not play)`, `(doesn't drink)`,
`(don't live)`, `(Do)`, `(Does)` — which is what trips the leak guard and
leaves the question mute. So: make the cue a real field, show it, and fix the
seven.

1. **Schema** (`gapExerciseSchema`): two optional fields.
   - `cue` — the dictionary form to inflect, when the trailing parenthetical
     cannot carry it.
   - `task` — `"negative" | "question"`, an override for the task line. `I ___
     football.` needs to say *make it negative*; "Write the form" does not, and
     no cue can rescue a question that never said what it wants.
2. **`lib/courses/prompt.ts`**: replace `typedPlaceholderHint` with
   `gapCue(exercise)` = explicit `cue` ?? trailing hint ?? `null`. The leak
   guard goes: a dictionary form beside a sentence is the standard shape of
   this exercise, and where the base form *is* the answer (`You ___ a new bag.
   (need)`) the question is still «-s or no -s», which is the whole point of
   that lesson. What must never happen is the answer's own inflected form
   standing in as the cue — that is step 3.4, in content, where it belongs.
3. **Rendering** (`exercise-view.tsx`): the cue goes in the prompt zone, under
   the sentence — "form of the word: play," `text-caption text-muted-foreground`,
   the word `lang="en"` and medium weight. The input's placeholder becomes
   plain `t("typeForm")` always. `FocusPrompt compact` is 96px; if sentence
   plus caption does not fit, the caption moves directly above the input rather
   than the zone growing (§15.2 — the geometry does not move).
4. **Content**, the seven items that name an answer as their cue:
   | item | now | becomes |
   | --- | --- | --- |
   | `ps-neg-04` | `I ___ football. (do not play)` | cue `play`, `task: "negative"` |
   | `ps-neg-10` | `He ___ tea. (doesn't drink)` | cue `drink`, `task: "negative"` |
   | `ps-neg-15` | `We ___ here. (don't live)` | cue `live`, `task: "negative"` |
   | `ps-bank-16` | `She ___ here. (doesn't live)` | cue `live`, `task: "negative"` |
   | `ps-q-06` | `___ you need more time? (Do)` | cue `do`, `task: "question"` |
   | `ps-q-12` | `___ she like tea? (Does)` | cue `do`, `task: "question"` |
   | `ps-bank-20` | `___ he work here? (Does)` | cue `do`, `task: "question"` |
   The trailing parenthetical comes out of those prompts — it is not drawn
   anywhere and would now contradict `cue`. The three `to-be-present` negatives
   already do this correctly with `(be)` and stay as they are, but they gain
   `task: "negative"` for the same reason `ps-neg-04` does.
5. **Messages**: `courses.formCue` ("form of"),
   `courses.taskGapNegative` ("Write the negative"), and
   `courses.taskGapQuestion` ("Write the auxiliary"). `lesson-player.tsx`'s
   `taskKey` learns the override.
   Both locales in the same commit — `i18n-messages.test.ts` checks parity.

Tests:
- `courses-prompt.test.ts`: `gapCue` — explicit cue wins over the
  parenthetical, falls back to it, `null` when neither. Drop the
  `typedPlaceholderHint` suite with the function.
- `courses-schema.test.ts`: a gap exercise parses with `cue` and `task`, and
  rejects an unknown `task`.
- New content lint (`courses-content.test.ts` or an addition to the schema
  suite): **every** gap exercise across all courses resolves a cue, and no
  resolved cue equals an accepted answer with an apostrophe or a space in it —
  that is the shape of the bug, and it stays caught.

## Step 4 — print the count once

`components/courses/lesson-player.tsx`, `components/practice/practice-session.tsx`.

Drop the `step` prop from those two `FocusHead` calls. The top bar keeps bar +
count, per §15.2. `FocusHead`'s `step` stays in the API: brainstorm still needs
it, and its rail carries no numbers. `courses.questionOf` and
`practice.wordOf` become unused — remove them from both locales unless
something else reads them (grep first).

## Step 5 — look at it

`npm test`, then `npm run dev` and three screens, per `CLAUDE.md`:

- `/dictionary` — 198 words, 25 per page, scroll the pane and watch the header
  stay; switch to 100; delete the whole last page; type into the search from a
  deep page.
- A `present-simple` lesson at `04-negatives` — the `I ___ football.` question
  reads as a negative and shows `play`.
- The same session's top bar — one count.

## Risks

- **65vh is a guess.** A short laptop window with the add-words panel above
  could leave the pane too small to be worth scrolling. Settle it in the
  browser; a `min-h` floor is the fallback.
- **Page size 25 makes the first paint bigger.** 25 rows of two short strings —
  measured in kilobytes, not a concern, but the pane must not push the
  pagination off screen, which is why step 1 comes before step 2.
- **`task: "negative"` is content saying something the lesson already says.**
  If the label starts repeating the lesson title on every item, the override is
  the wrong shape and the task line should come from the rule instead. Watch it
  on the four negatives items before extending the field anywhere else.
