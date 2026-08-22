# Plan: navigation — do first, own second

**Status:** shipped 2026-08-18. Kept because code comments cite it — see `CLAUDE.md` → Plans.

**Date:** 2026-08-17 · **Branch:** `nav-ia` · **Status:** in progress
**Source:** sidebar review and a target IA screenshot (Home / Learn /
Dictionary / Profile). Decision: do not implement sections 1 and 2 from the
screenshot.

## Problem

The sidebar describes a product that Slova is not yet. Six of its twelve items
are placeholders. The first item is a dead-end Learning Map. Grammar appears
twice. Tasks sounds like a school journal. In iPad landscape, the menu does not
fit without `@media(max-height:800px)` in
`components/layout/sidebar.tsx`.

The target structure in the screenshot (Dashboard → Learn → Dictionary →
Profile) copies Duolingo. Slova works differently: people bring their own
words, then practise them. Separate Home and broad Practice & Learning
sections (trainings + grammar + reading + courses/topics) put too much in the
menu, both now and later.

## Outcome

The sidebar has four working items. Activities come first, owned material
second. After sign-in, the user lands directly on Trainings rather than a
dashboard. Placeholders disappear from the menu. The map, reading, topics,
curated sets, and progress as a section are not navigation items; their future
locations are recorded below.

## Success criteria

- [x] The sidebar contains exactly: Trainings, Grammar, My words, My sets
- [x] Grammar appears once and links to `/courses/grammar`
- [x] There are no placeholder items; Today and Map are absent
- [x] `SIGNED_IN_HOME` = `/practice`; the logo, sign-in, and session exit
      lead there
- [x] `/home`, `/tasks`, and `/tasks/today` open Trainings
- [ ] On iPad mini landscape, every item is visible without sidebar scrolling
      or vertical compression
- [x] `npm test` is green; `tests/unit/nav.test.ts` describes the new map
- [x] §15.1 of `docs/design-system.md` matches the live menu

## Non-goals

- Do not build the map, reading, curated sets, topical courses, or a progress
  dashboard
- Do not move `OverviewStats` from Today to Trainings or Profile:
  `/tasks/today` redirects and the widget can be placed later
- Do not merge My words and My sets into tabs; revisit the screenshot's idea
  when a catalog exists
- Do not introduce a Learn section or a Home item
- Do not change FocusShell, search, account controls, or sidebar collapsing
- Do not create a new visual language: keep the tokens, 17px icons,
  `radius-sm`, and `eyebrow` section color
- Do not merge into `main` without asking

## Context found in the codebase

Working screens:

| Screen | Path | In the new menu |
|---|---|---|
| Trainings | `/practice` | yes, first |
| Grammar | `/courses/grammar` | yes |
| My words | `/dictionary` | yes |
| My sets | `/dictionary/sets` | yes |
| Today | `/tasks/today` | no, redirects to `/practice` |
| My courses | `/courses/my` | no, linked from the catalog |

The remaining placeholders are also absent from the menu:
`/practice/grammar`, `/practice/reading`, `/courses/topics`, and
`/dictionary/catalog`. `/tasks` redirects to Trainings, while
`/tasks/progress` redirects to the working `/progress` screen.

The application home was previously spread across `SIGNED_IN_HOME` in
`lib/auth.config.ts`, the redirect in `app/page.tsx`, the logo in
`components/layout/sidebar.tsx`, the session exit in
`components/study-session.tsx`, and `/home` in `next.config.ts`. Every
one of them pointed to `/tasks/today`.

The navigation map is `lib/nav.ts`. Icons live in
`components/layout/sidebar.tsx`. Labels are under `nav` in
`messages/{ru,en}.json`. §15.1 of the specification previously listed Tasks
/ Practice / Courses / Dictionary.

The grammar catalog already filters by the user's level and sorts started
courses. My courses is a secondary entry point, not a new model. The Grammar
practice placeholder (`/practice/grammar`) duplicates work the course already
does. Topics and Curated sets under `comingSoon` are one feature exposed in
two sections.

The `/study` session previously highlighted Today through `matches` in
`lib/nav.ts`. Because sessions start from Trainings, that highlight should
move there.

## Design

**Chosen: four items, without Home or Learn.**

```
┌─────────────────────┐
│  Slova        🔍  ⇤ │
├─────────────────────┤
│  Study              │
│    Trainings        │
│    Grammar          │
│                     │
│  Dictionary         │
│    My words         │
│    My sets          │
│                     │
├─────────────────────┤
│  NI  Nikolai     ↕  │
└─────────────────────┘
```

Trainings and Grammar sit under Study: they are two ways to study, not the
Learn section from the screenshot. Dictionary remains a group because both
items describe owned material. The order puts the daily action first (open the
app and practise) and inventory second.

The application home is `/practice`. Its source bar already exposes material
due for review, so a separate Today screen no longer has a place in the
product. Both `/tasks/today` and `/tasks` redirect there to avoid an orphaned
route or a map placeholder above the former home.

My courses keeps its URL but is absent from `NAV_SECTIONS`. The catalog links
to it when there are started courses.

Only these ideas are retained from the screenshot:

| Screenshot idea | Decision |
|---|---|
| 1. Home (Today + map) | Do not render it. Do not build the map: the product is not a linear path |
| 2. Practice & Learning (four items) | Do not render it as a section. Keep only the two working items: Trainings and Grammar. Merge both grammar entries into `/courses/grammar` |
| 3. Dictionary: all words + sets with a catalog | Keep words and sets. Add the catalog as a sets tab when it exists, not now |
| 4. Profile & progress | Do not make it a sidebar item. Put metrics in Profile or Trainings later |

Place future features without creating Home or Learn:

| Feature | Location |
|---|---|
| Learning map | Nowhere in the menu. If it ever exists, it belongs to a different product model |
| Today / overview | Not an item. Due dates belong in the source bar. Add a streak widget to Profile or the Trainings header as a separate step |
| Grammar practice | Inside a course |
| Reading | A third item beside Trainings and Grammar, still without a Learn heading |
| Topics + curated sets | One entry: a tab in My sets, not a sibling menu item and not Courses / Topics |
| My courses | A catalog section, not an item |
| My progress | Profile |

**Why this approach instead of the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| A (chosen): four items, home = Trainings | The menu contains what works; no Dashboard or Learn | Today disappears from navigation | chosen |
| B: five items, Today first with no section | The previous version of this plan | A dashboard without a heading is still section 1 from the screenshot | rejected: section 1 must go |
| C: reproduce the screenshot | Home / Learn / Dictionary / Profile | Half of the items are future work; Learn mixes four different activities | rejected: sections 1 and 2 must not be rendered |
| D: flat list without Dictionary | Four items in one column | With only four items, the Dictionary heading is almost redundant, but without it words and sets read like two more trainings | fallback if step 2 is still too tight on iPad mini |

**What would change this decision:** a requirement to keep Today as the
post-sign-in destination. In that case, choose approach B and do not begin this
plan by changing `SIGNED_IN_HOME`.

**Touches:** UI (`lib/nav.ts`, `components/layout/sidebar.tsx`,
`messages/{ru,en}.json`) · home (`lib/auth.config.ts`, `app/page.tsx`,
`next.config.ts`, `components/study-session.tsx`) · tests
(`tests/unit/nav.test.ts`) · §15.1 of the specification · README. No schema,
API, migration, or dependency changes.

## Steps

### 1. Update `NAV_SECTIONS` — S · `[x]`

- **Why first:** highlights, tooltips, and tests are all driven by this table.
- **Files:** `lib/nav.ts` (edit), `tests/unit/nav.test.ts` (edit), and the
  `nav` keys in `messages/ru.json` and `messages/en.json` (edit)
- **Does:** create two sections. The first is `study` (Study), containing
  Trainings at `/practice` (matching `/practice/vocabulary` and `/study`)
  and Grammar at `/courses/grammar`. The second is `dictionary`, containing
  My words (matching `/import`) and My sets. `/courses/my` is not an item;
  course lessons continue to highlight Grammar.
- **Verify:** `npm test -- tests/unit/nav.test.ts` — four hrefs;
  `/study` → `/practice`;
  `/courses/grammar/present-simple/forms` → `/courses/grammar`;
  `/dictionary/sets/abc` → `/dictionary/sets`;
  `/tasks/today` → `null` (the redirect need not exist in this step)
- **Depends on:** —

### 2. Sidebar, icons, and rhythm — S · `[x]`

- **Files:** `components/layout/sidebar.tsx` (`NAV_ICONS`, the section
  loop, logo `href={SIGNED_IN_HOME}` or `/practice`, the comment about
  twelve items, and `@media(max-height:800px)`)
- **Does:** keep icons for only four hrefs. Remove vertical compression. Do not
  reserve an extra `h-6` for an unlabeled group.
- **Verify:** inspect at widths 834 and 1194 and a height around 744. All four
  items remain visible. Highlights work on Trainings, a grammar lesson, a
  word, and a set.
- **Depends on:** 1

### 3. Home = Trainings — S · `[x]`

- **Files:** `lib/auth.config.ts` (`SIGNED_IN_HOME`), `app/page.tsx`,
  `next.config.ts` (`/home` → `/practice`; add `/tasks` and
  `/tasks/today` → `/practice`), `components/study-session.tsx` (exit to
  `SIGNED_IN_HOME` or `/practice`), and
  `app/(app)/tasks/page.tsx` plus `app/(app)/tasks/today/page.tsx`: either
  remove them and rely on `next.config`, or call `redirect("/practice")`
  if config redirects do not cover them
- **Does:** sign-in, the authenticated landing page, logo, `/home`, the former
  home, and the map root all lead to Trainings. Leave remaining coming-soon
  routes alone; they simply have no menu entry. `/tasks/progress` was later
  redirected to the working `/progress` page.
- **Verify:** signed out, `/` shows the landing page; signed in, `/`,
  `/tasks/today`, and `/home` lead to `/practice`. Exiting a question
  returns to Trainings. Run `npm test`.
- **Depends on:** 1

The permanent `/home` redirect already pointed to Today. Keep it permanent
when changing its destination to `/practice`; the old URL was already retired.

### 4. Link My courses from the catalog — S · `[x]`

- **Files:** `components/courses/grammar-catalog.tsx` or
  `app/(app)/courses/grammar/page.tsx`
- **Does:** link to `/courses/my` when there are started courses. If the page
  would otherwise be orphaned, an always-visible link is acceptable because
  its existing empty state already works.
- **Verify:** started courses can be opened from the catalog.
- **Depends on:** 1

### 5. Specification and README — S · `[x]`

- **Files:** §15.1 of `docs/design-system.md`, the Screens table in
  `README.md`, and this file to mark completed steps
- **Does:** document Trainings and Grammar followed by the Dictionary section.
  The README no longer promises Today, the map, reading, topics, or curated
  sets in the sidebar.
- **Verify:** compare §15.1 with the live sidebar.
- **Depends on:** 2

Steps 3, 4, and 5 can run in parallel after step 2.

## Risks

| Risk | Early signal | Cheapest way to resolve it now |
|---|---|---|
| Today was actually intended to remain home | The owner opens the app and looks for metrics | Do not start step 3; return to approach B |
| Loss of `OverviewStats` | Trainings has no streak or dictionary overview | Deliberately a non-goal; restore it as a widget in a separate step |
| `/courses/my` becomes hard to find | The catalog has no link | Step 4 |
| Existing `/tasks/today` bookmarks | Someone expected the overview | Redirecting to Trainings is more honest than leaving an orphan |
| Permanent `/home` already pointed to Today | Old clients cached it | Replace it with a permanent redirect to `/practice`; `/home` is not a live page |

## Rollback

Only UI, copy, and redirects change. Use `git revert`; no data is involved. A
deployed permanent `/home` redirect can be reversed by a later deployment.

## Test plan

- Unit: `tests/unit/nav.test.ts` — composition, no duplicate hrefs,
  longest-claim behavior for sets and lessons, `/study` → Trainings,
  `/import` → My words, and `/tasks/today` → `null`
- In-session: run `npm test` and inspect widths 834 and 1194 plus a short
  window; sign-in should lead to Trainings
- Intentionally not tested: FocusShell, search, and the contents of
  coming-soon pages

## Rollout

No flag. Keep the work on the branch, run `npm test`, and inspect it before
merging to `main` once the batch is ready and approved. After deployment:
sign-in leads to Trainings; the sidebar has four items; a grammar lesson
highlights Grammar; `/tasks/today` is absent from the menu and no longer opens
as a page.

## Open questions

None. Sections 1 and 2 from the screenshot are not rendered, home is Trainings,
and My courses is linked from the catalog.

## Deferred / out of scope

- The streak widget on Trainings and the `/progress` screen are done; progress
  is reached from the account menu, not the sidebar
- Reading as a third item beside Trainings
- Curated sets as a tab in My sets, without adding Topics beside it
- An In progress section inside the grammar catalog instead of a separate
  `/courses/my`
- All words / sets tabs on a single screen
- A flat list without the Dictionary heading (approach D)
- Learning map
