# Plan — one activity spine for Progress

Status: in progress on `feat/progress-activity`. Steps 1–4 done; step 5 waits
on [Phrases](phrases.md).
Source: brainstorm session 2026-08-22. Prerequisite for
[Reader](reader.md), [Speaking](speaking.md), [Phrases](phrases.md) and
[Dialogues](dialogues.md).

## 1. Why this one, before the others

`lib/progress.ts:getStudyActivity` currently costs, per new kind of activity:
one more query in an eight-query `Promise.all`, one more array of day keys on
`StudyActivity`, one more prop threaded through
`app/(app)/progress/page.tsx` into `components/progress/study-calendar.tsx`,
and one more entry in its legend. Four kinds exist today — reviews, grammar
lessons, stories, grammar review.

The pattern is not merely repetitive. **Its failure mode is silent, and it has
already fired twice.** Both repairs are still in the file as comments:

> *Reading and answering a story never touch `UserWord` or `ReviewLog` […] so
> without this the calendar would show no activity at all on a day spent only
> on stories.*

> *A grammar day is otherwise recognised through `UserLesson.completedAt`,
> which a day spent only in Grammar Review never writes. Without this the
> streak would break on a day the learner did exactly what was asked.*

A new section that forgets this ships looking fine. Nobody notices until a
learner reads a text for twenty minutes, opens Progress, and finds an empty
square and a streak reset to zero. That is the single worst thing this app can
do to somebody, and the current design makes it the *default* outcome of
adding a section rather than an oversight.

The four planned sections would take that from four streams to eight.

There is also something already paid for and not yet spent. `StudySitting`
stores `durationSec`, `kind`, `label`, `reviews`, `goods`, `agains`,
`introduced` for every sitting, and its own schema comment says what was
intended: *"Hours, weekly bars and 'practice vs grammar' will sum these; until
then they just accumulate."* README repeats the promise — *"Minutes of each
sitting are stored; hours wait until there are enough days."* The rows are
there. The page does not read them: `getStudyActivity` touches `StudySitting`
only through `GRAMMAR_REVIEW_SITTING`, one filtered slice of one kind.

So this plan is two things at once: make adding a section to Progress a
one-line change instead of a four-file ritual, and spend the measurement
already sitting in the database.

## 2. Scope

**In:** `StudySitting` becomes the single activity spine; day keys become one
keyed structure instead of N named arrays; the calendar takes one prop and
renders its legend from data; minutes and the per-kind weekly split appear on
Progress; the dictionary bar stops conflating words with phrases.

**Out:**

- **An events table, an analytics pipeline, or any warehouse.**
  `docs/product-scope.md` rules out queues, workers and monitoring
  infrastructure, and this is one page of Postgres aggregates for one person.
- **Changing what a streak means.** The definition in
  `lib/progress.ts:currentStreak` — including yesterday counting until today
  is over — is deliberate and stays exactly as it is. This plan changes where
  the timestamps come from, never the arithmetic over them.
- **Retroactive history.** Days before the change keep whatever they show now;
  no backfill invents sittings that were never recorded.
- **Per-section metrics.** Each section's own plan owns its tiles; this one
  owns the spine they plug into.

## 3. Success criteria

- [ ] `getStudyActivity` runs **no more queries after this than before**, and
      adding a fifth activity kind adds **zero**.
- [ ] Streak, longest streak and calendar output are **byte-identical** before
      and after the refactor over a fixture spanning stories, lessons, grammar
      review and reviews. This is the test that makes the refactor safe.
- [ ] A day spent only on a new kind keeps the streak — asserted by a test
      parameterised over kinds, so a future section inherits the assertion
      instead of having to remember it.
- [ ] Minutes studied appear on Progress, sourced from `durationSec`, matching
      the sum of the day's sittings.
- [ ] The dictionary bar reports words and phrases separately.
- [ ] `npm test`, lint, typecheck green; Progress opened in a browser at phone
      and desktop width.

## 4. Design

**Chosen: `StudySitting` is the spine; `ActivityDay` is one keyed map.**

Every activity that a person would call "studying" already has, or can cheaply
have, a `StudySitting` row — the model exists, records duration, and is
already written by `lib/sitting.ts` for practice, brainstorm, study and
grammar. `SittingKind` grows to cover the new sections. `getStudyActivity`
then asks for sittings **once**, grouped by kind, instead of once per feature.

`StudyActivity` loses its named arrays and gains
`dayKeysByKind: Record<ActivityKind, string[]>`, plus the union it already
computes. `StudyCalendar` takes that one map and renders a legend from its
keys, so a new kind appears on the calendar because it exists, not because
four files were edited.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| **A (chosen)** — `StudySitting` as spine, keyed day map | One grouped query; new kinds are data | One refactor of a shipped, streak-bearing calculation; stories need a sitting row where today they have only `StoryProgress` | Uses a model that already exists and already stores duration, and makes the silent failure structurally impossible |
| B — a new `ActivityEvent` table everything writes to | Purpose-built append-only rows | Conceptually cleanest; a new table, a migration, and a duplicate of what `StudySitting` already is | Rejected: it adds a table to avoid using the table we have |
| C — keep the pattern, add four more streams | Thirty lines per section | No refactor risk at all, and it genuinely works | Rejected on the failure mode, not on the line count: the mistake is silent, it has already happened twice, and it is about to be offered four more chances |

**What would change this decision:** if `StudySitting` turns out to be a poor
fit for a *passive* activity — reading a text has no reviews, no goods, no
agains — then B becomes worth its table. Step 1 answers that against real
columns rather than in the abstract; the honest fallback is that reading
writes a sitting with zeroed counters and a real `durationSec`, which is
already what a grammar-review sitting looks like from the counters' side.

**Retro-fitting stories.** `StoryProgress` stays as it is — it holds answers
and completion, which are not activity. The story reader gains a sitting the
same way a training does. Old story days keep working through the existing
`StoryProgress` path, kept for one release as a union member and removed once
the calendar has been eyeballed on real data.

**Touches:** `lib/sitting.ts` (kinds), `lib/progress.ts` (the spine),
`components/progress/study-calendar.tsx`, `app/(app)/progress/page.tsx`,
`lib/overview.ts` (word/phrase split), i18n for the legend and the new tiles.
No migration for the spine; none for the phrase split either, since
`lib/lexicon/dataset.ts:kindOf` already answers it.

## 5. Steps

### 1. Lock the current behaviour in a test — S · `[x]`

- **Why first:** this is a refactor of the number a person's motivation is
  attached to. Nothing else may start until the old behaviour is pinned.
- **Files:** `tests/unit/progress-activity.test.ts` (new),
  `tests/fixtures/progress/*.json` (new).
- **Does:** a fixture with days of each kind — reviews only, story only,
  grammar-review only, lesson only, mixed, and a gap — asserting streak,
  longest, calendar keys and the weekly count against today's implementation.
- **Verify:** `npm test` green **against the unchanged code**. A test that only
  passes after the rewrite proves nothing.

### 2. Make `StudySitting` the spine — M · `[x]`

- **Files:** `lib/sitting.ts` (`SittingKind` grows), `lib/progress.ts`
  (`getStudyActivity`, `getProgress`), `tests/unit/progress-activity.test.ts`.
- **Does:** replaces the per-feature queries with one grouped read of
  sittings, plus `ReviewLog` for review counts. `StudyActivity` gains
  `dayKeysByKind`; the named arrays go.
- **Verify:** the step 1 test, unchanged, still passes. Query count asserted
  or logged via `measureServerOperation("progress.full_report", …)`, which
  already wraps this call.

### 3. One prop for the calendar, legend from data — S · `[x]`

- **Files:** `components/progress/study-calendar.tsx`,
  `app/(app)/progress/page.tsx`, i18n.
- **Does:** the calendar takes `dayKeysByKind` and renders the legend by
  iterating it. A kind with no days in the window is not drawn.
- **Verify:** browser, phone and desktop width, against an account with story
  and grammar days.

### 4. Spend the minutes that are already stored — M · `[x]`

- **Files:** `lib/progress.ts`, `components/progress/metric-tile.tsx`,
  `app/(app)/progress/page.tsx`, `lib/progress-config.ts`, i18n.
- **Does:** minutes today and this week from `durationSec`, and a weekly bar
  split by kind — the "practice vs grammar" the `StudySitting` comment
  promised, now with reading, speaking and dialogue as further kinds when they
  exist. Honours the existing rule that hours wait until there are enough days
  (`MEMORY_MIN_WORDS` is the precedent for a "not enough data yet" gate).
- **Verify:** unit tests for the aggregation and the not-enough-days gate;
  browser check that the minutes match a sitting just finished.

### 5. Split words from phrases in the dictionary bar — S · `[ ]`

- **Files:** `lib/overview.ts`, `components/overview-stats.tsx`, i18n,
  `tests/unit/overview.test.ts`.
- **Does:** `getOverview` counts `UserWord` by `kindOf(front)`. Without this,
  [Phrases](phrases.md) silently inflates "words learned" — forty phrases
  would read as forty words, and the one number a person uses to judge their
  own progress would quietly stop meaning what it says.
- **Verify:** unit test over a fixture with both; browser.

Steps 1→2 are strictly sequential. 3, 4 and 5 are independent once 2 lands.

## 6. The rule this plan exists to enforce

**A section is not finished until a day spent only in it keeps the streak and
colours a square on the calendar.**

That sentence goes into `docs/MIGRATION.md`'s screen checklist in step 3, and
the parameterised test from step 2 is what makes it true by default rather
than by memory. Each of the four section plans now carries a Progress step
that points here.

## 7. Risks

| Risk | Noticed by | Cheapest resolution |
|---|---|---|
| **The refactor silently changes somebody's streak** | Step 1's test, written before any change | The whole ordering of this plan exists for this |
| A passive activity fits `StudySitting` badly | Step 2, against real columns | Zeroed counters plus a real duration — what a grammar-review sitting already looks like |
| Story days regress during the transition | Step 1 fixture includes story-only days | `StoryProgress` stays in the union for one release |
| A sitting is left open and never ends, inflating minutes | Existing behaviour: a sitting stale for 3 hours closes at `lastAt` | Already solved in `lib/sitting.ts`; the reading and dialogue sections must reuse it rather than invent their own close rule |
| Reading time is not study time in the same sense as a review | Reading the page | It is shown as its own kind on the split bar, never merged into one "minutes studied" number that hides what they were |

**Rollback:** no migration, so `git revert` is the whole story. The named
arrays can be kept as deprecated aliases for one release if the calendar needs
a staged switch.

## 8. Deferred

- **Retention and memory per kind.** Interesting, and it needs more data than
  one person generates in a month.
- **Backfilling sittings for historical story reads.** Possible from
  `StoryProgress.startedAt`; low value against the risk of inventing history.
- **An explicit weekly goal.** `studyDaysThisWeek` already computes the input
  for one, and a goal is a product decision, not a refactor.
