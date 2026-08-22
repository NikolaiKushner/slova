# Plan: pre-release cleanup

**Status:** shipped 2026-08-17. Kept because code comments cite it — see `CLAUDE.md` → Plans.

**Date:** 2026-08-17 · **Branch:** `landing-redesign` · **Status:** done
**Source:** pre-release review of `docs/MIGRATION.md` (chat) + four items from the owner

## Problem

The redesign on `landing-redesign` is feature-complete enough to merge, but the
branch still carries the migration's temporary token aliases, a `PageHeader`
that predates the type scale, Russian comments in the files agents actually
read, and a README that describes the product before courses and the source
bar. Merging as-is ships a working app that still looks unfinished in the
places the spec already named.

## Outcome

One person can open any app page and see `PageHeader` / verdict colours /
progress bands from the same tokens as `/dev/kit`. A contributor who only
reads English can follow `docs/design-system.md`, `docs/MIGRATION.md`,
`CLAUDE.md`, and `README.md` without a second language. Grep for the old
palette names returns nothing in `app/` and `components/`.

## Success criteria

- [x] `PageHeader` is `Eyebrow` + `text-h1` + `text-lead`; no `uppercase` in
      the markup; bottom gap `mb-10` (40px, §14)
- [x] `app/globals.css` has no «ОТСТУПЛЕНИЕ 4» block; grep for
      `brand-soft|brand-deep|text-correct|text-wrong|font-heading` in
      `app/` and `components/` is empty
- [x] `components/brand-mark.tsx` names Literata 600, not Fraunces
- [x] `docs/MIGRATION.md` marks steps 0–5 and the done backlog rows; remaining
      backlog stays as product decisions
- [x] Living docs and code comments are English; `messages/ru.json` and course
      copy are untouched
- [x] `README.md` matches the shipped screens (source bar, two grammar
      courses, bilingual chrome) and no longer says trainings ask for sets on
      a second screen
- [x] `npm test` green after every step; Today / My words / a training summary
      looked at in the browser after step 1

## Non-goals

- Not merging to `main` (ask first, per `CLAUDE.md`)
- Not wiring hex/input guardrails into CI
- Not mounting `Toaster` / not deleting unused shadcn primitives that §13
  told us to install (`tabs`, `drawer`, `command`, `field`, `sonner`,
  `scroll-area`, `radio-group`)
- Not translating `messages/ru.json`, course JSON, test fixtures, OG image
  copy, or landing stills — that is the product, not documentation
- Not rewriting `AGENTS.md` (Next.js regenerates it) or vendored
  `.agents/skills/neon*`
- Not dark theme, lesson-order, or brainstorm-stage product decisions

## Context found in the codebase

**PageHeader vs spec.** `docs/design-system.md` §14: `PageHeader` = `Eyebrow`
+ `h1` + `lead`, 40px below. The live file
(`components/page-header.tsx`) hand-rolls
`text-sm … uppercase … text-brand-soft` and `font-display text-4xl`.
`components/slova/eyebrow.tsx` already does the overline correctly (uppercase
from CSS, colour `text-eyebrow`). Call sites (~10) keep the `eyebrow` prop
name — the spec's `overline` is the type style, not a reason to churn i18n
keys.

**Token bridge.** `app/globals.css` lines 540–580, labelled temporary, still
aliases: `brand-soft` → `--eyebrow`, `correct`/`wrong` → success/destructive,
`font-heading` → `--font-display`, `sidebar-hover` / `sidebar-active`.
Call sites left: `page-header.tsx`, `tasks/today/page.tsx` (streak line),
`overview-stats.tsx` (learning band — should be `bg-data-learning`, §5.3),
`drill-summary.tsx`, `coming-soon.tsx`, `courses/my/page.tsx`,
`study-session.tsx`, `components/ui/{dialog,sheet,drawer,alert-dialog,empty}.tsx`,
`components/ui/sidebar.tsx` + `layout/sidebar.tsx` + `app-search.tsx`
(`sidebar-hover`). Canonical tokens already exist: `text-eyebrow`,
`text-success`, `text-destructive`, `bg-data-*`, `font-display`,
`bg-sidebar-accent`.

**Dead code that is not dead.** `StudySession` is the due-cards player at
`/study`, not a leftover of the seven formats. `ComingSoon` pages (map,
reading, topics, catalog, progress) are placeholders. Unused shadcn files
are the §13 kit. Real leftovers: the token bridge; `overview-stats.tsx`
still citing retired `DESIGN.md`; stale `docs/plans/shipped/landing-from-mockup.md`
(work has landed, checkboxes still empty); `CLAUDE.md` still saying
Prisma/SQLite.

**Russian that must stay.** UI strings, `titleRu`, stills, tests that assert
on Russian. Russian that must move: `docs/design-system.md` (~900 lines),
`docs/MIGRATION.md`, `CLAUDE.md` design-system block, `app/globals.css` /
`docs/globals.reference.css` comments, `docs/tokens.html` labels,
scattered comments (`sidebar.tsx`, `stage-rail.tsx`, `app-shell.tsx`,
`/dev/kit` chrome). `/dev/kit` option labels can stay Russian — they are
sample UI, not comments.

**README already English**, but outdated: trainings “each asks which sets”;
no courses; no i18n; count `8,172` on the landing was replaced by “more than
8,000”. Voice to keep: shared dictionary as cache, not authority.

**Analogous change:** step 1 of the migration (`97a4d0a`) swapped the token
file without touching layout. This plan is the promised inverse: delete the
bridge now that screens have moved. Same rule: one concern per commit, app
stays runnable.

## Design

**Chosen: finish the migration's leftover in code first, then translate the
docs that describe that finished state, then rewrite the README to match.**
Token replacement is mechanical: each old class maps to one semantic class
already in `@theme`. Sidebar hover/active collapse onto `sidebar-accent` /
`muted` rather than keeping alias names — the spec never had two sidebar
surfaces. Docs are translated, not rewritten: same headings, same numbers,
same prohibitions; only the language changes. Historical `plans/` and
`research/` stay as dated archives (assumption — see Open questions).

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| A (chosen) | Retire aliases → inventory leftovers → translate living docs → README last | README cannot drift from a half-translated spec | **take** |
| B | Translate docs first, then touch tokens | Agents read an English spec that the code still violates | rejected: the spec is already right; the code is late |
| C | Promote `brand-soft` into the real theme so grep stays quiet without edits | Old names become load-bearing again | rejected: that is how the bridge never dies |

**What would change this decision:** if a visual check after step 1 shows
`text-h1` (32px) too small on Today/My words compared with `text-4xl` (36px),
stop and agree the type scale before translating 900 lines.

**Touches:** UI (`page-header`, today, overview, drill-summary, a few
shadcn titles, sidebar hover) · CSS (delete bridge; English comments) ·
docs (`design-system.md`, `MIGRATION.md`, `CLAUDE.md`, `README.md`,
`tokens.html`) · no schema, API, migrations, or new deps.

## Steps

### 1. Retire the token bridge and put PageHeader on the scale — M · `[x]`

- **Why first:** the only step that can make a page look wrong. If `text-h1`
  or `bg-data-learning` is rejected, everything after is wasted.
- **Files:** `components/page-header.tsx` (use `Eyebrow`, `text-h1`,
  `text-lead`, `mb-10`); `app/(app)/tasks/today/page.tsx` (streak line →
  `text-overline text-eyebrow`, drop the hand-rolled uppercase);
  `components/overview-stats.tsx` (bands → `bg-data-learned` /
  `bg-data-learning` / `bg-data-untouched`; drop the `DESIGN.md` comment);
  `components/practice/drill-summary.tsx` (`Eyebrow`, `text-h1`,
  `text-success` / `text-destructive`); `components/coming-soon.tsx`,
  `app/(app)/courses/my/page.tsx`, `components/study-session.tsx`
  (`text-eyebrow` / `text-overline`); `components/ui/{dialog,sheet,drawer,
  alert-dialog,empty}.tsx` (`font-heading` → `font-display`);
  `components/ui/sidebar.tsx`, `components/layout/sidebar.tsx`,
  `components/app-search.tsx` (`hover:bg-sidebar-hover` →
  `hover:bg-sidebar-accent`); `components/brand-mark.tsx` (Literata 600,
  drop “wonkier”); `app/globals.css` (delete the entire ОТСТУПЛЕНИЕ 4
  `@theme` block)
- **Does:** old names die; PageHeader matches §14; progress colours match
  §5.3. Behaviour unchanged.
- **Verify:** `rg -n 'brand-soft|brand-deep|text-correct|text-wrong|font-heading|sidebar-hover|sidebar-active' app components` empty.
  `npm test`. Open `/tasks/today`, `/dictionary`, `/practice`, finish one
  drill, `/courses/my` — eyebrows overline via CSS, numbers not black where
  they were green/red.
- **Depends on:** —

### 2. Inventory leftovers; delete only what grep proves unused — S · `[x]`

- **Why now:** after aliases are gone, “leftover” is no longer confused with
  “old name still needed”.
- **Files:** `docs/plans/shipped/landing-from-mockup.md` (set **Status: done** and
  tick the success boxes that the code already satisfies, or delete the
  file — prefer status=done, one paragraph of “landed on this branch”, no
  rewrite); `CLAUDE.md` Prisma/SQLite → Neon Postgres (full English pass is
  step 4). Do **not** delete unused `components/ui/*` on the §13 install
  list. Do **not** delete `StudySession` or `ComingSoon`.
- **Does:** a written list in the commit message of what was considered and
  kept. Only the stale landing plan is closed.
- **Verify:** `rg -l 'from "@/components/'` still resolves for every
  remaining component; `npm test`.
- **Depends on:** 1 (so the inventory does not treat `brand-soft` as live
  API)

### 3. Translate `docs/design-system.md` — L · `[x]`

- **Why this size:** it is the source of truth. A mid-file mix of languages
  is worse than a large commit. Do not split by section.
- **Files:** `docs/design-system.md` only. Keep structure, tables, hex
  values, component names. Translate prose. Fix the structure tree in §19.2
  while there: `PageHeader` lives at `components/page-header.tsx`, not
  `components/slova/page-header.tsx`; grain is a class on `body`, not a
  `GrainOverlay` component. Do not “improve” rules.
- **Does:** English spec. Same meaning.
- **Verify:** headings 1–20 still present; §13 install command unchanged;
  spot-check §14 PageHeader against the code from step 1.
- **Depends on:** 1 (so §14 describes what the code does)

### 4. Translate the rest of the living docs and comments — M · `[x]`

- **Why after the spec:** `MIGRATION.md` can then tick steps against an
  English design-system, and CSS comments can say “deviation” instead of
  «ОТСТУПЛЕНИЕ».
- **Files:** `docs/MIGRATION.md` (English + mark steps 0–5 done, Russian
  landing backlog done, remaining backlog untouched); `CLAUDE.md` (English
  design-system block already quoted there; Neon not SQLite);
  `app/globals.css` remaining Russian comments; `docs/globals.reference.css`
  comments; `docs/tokens.html` (`lang="en"`, English labels — hex
  unchanged); comments in `components/layout/{app-shell,sidebar}.tsx`,
  `components/slova/{stage-rail,letter-tiles,answer-*}`,
  `app/dev/kit/page.tsx` (page chrome in English; sample option text may
  stay Russian)
- **Does:** an English-only trail for agents. Product copy untouched.
- **Verify:** `rg -n '[А-Яа-яЁё]{4,}'` over `docs/*.md`, `CLAUDE.md`,
  `app/globals.css`, `docs/globals.reference.css`, `docs/tokens.html` is
  empty except quoted Russian UI examples (ёлочки, «вы», sample aria-label
  «Слово 3…»). `npm test`.
- **Depends on:** 3 (MIGRATION ticks refer to the spec)

### 5. Rewrite README to the shipped product — S · `[x]`

- **Why last:** it should describe the branch after 1–4, not before.
- **Files:** `README.md`. Keep the cache-vs-authority explanation. Update
  Screens: Today, Trainings (source bar on the same page — no second
  screen), My words, My sets, Grammar courses (Present Simple, to be;
  Coming Soon for map/reading/topics). Mention bilingual chrome
  (`next-intl`, no locale in the URL). Quote the shared dictionary as
  “more than 8,000”, not a seed-exact count. Point at `docs/design-system.md`
  as the visual source of truth; `docs/MIGRATION.md` as the completed
  rebuild record, not a todo. Keep licence / env / scripts tables; they
  are still true.
- **Does:** a stranger cloning the repo understands what runs on
  `slova.study` after this branch merges.
- **Verify:** read once against the sidebar in `lib/nav.ts`. No claim that
  contradicts `CLAUDE.md`. `npm test` (no code).
- **Depends on:** 4

*(Steps 3 and 4 are sequential. 2 can overlap with 3 once 1 is in.)*

## Risks

| Risk | Early signal | Cheapest way to resolve it now |
|---|---|---|
| `text-h1` feels small after `text-4xl` | First look at Today / My words | Step 1 and stop; do not start the spec translation |
| `sidebar-accent` on hover = active | Menu items look “stuck” | Use `hover:bg-muted` for hover, keep `data-active:bg-sidebar-accent` |
| Spec translation drifts a rule | A number or prohibition changes | Translate, do not edit; structure-tree fixes in §19.2 are the only allowed factual corrections |
| Grep for Cyrillic false-positives | Course titles, tests, `messages/ru.json` | Scope the grep to living docs and comments, never to `messages/` or `content/` |

## Rollback

No migrations. Revert the commit of the step. Step 1 is the only visual
revert; docs reverts are free.

## Test plan

- Unit: existing `npm test` after each step; no new tests for class-name
  swaps
- Manual: after step 1, Today, My words, practice hub, one drill summary,
  My courses, a Coming Soon page, `/dev/kit` — 1440 and 768
- CI: `npm test` + lint + build, as today
- Deliberately untested: screenshot diffs (no pipeline); e2e; hex
  guardrail in CI (deferred)

## Rollout

No flag. Commits stay on `landing-redesign`, one per step. Merge to `main`
is a release — not part of this plan. Confirm after a future merge by
opening `slova.study` signed out (landing) and signed in (Today header).

## Open questions

- [x] **Historical `plans/` and `research/*.md`.** Deleted: the work they
      tracked has shipped. Living docs were translated instead.

## Deferred / out of scope

- Hex and `text-sm` input greps in CI (`docs/MIGRATION.md` guardrails)
- Mount `Toaster` from `components/ui/sonner.tsx` (installed, never wired)
- Move `page-header.tsx` into `components/slova/` to match the old §19.2
  tree — path churn, no visual gain
- Auth stills beside the form
- Dark theme
- Product backlog in `MIGRATION.md` that still says “needs a decision”
