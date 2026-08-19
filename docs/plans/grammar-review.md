# Grammar Review — specification

Status: proposed 2026-08-19, awaiting maintainer approval  
Primary route: `/courses/grammar/review`  
Entry point: `/courses/grammar`, above the level bar, only when at least one
rule is due  
Container: catalog `container-list` (780), session `container-focus` (540)

## 1. Decision

Build a cross-course Grammar Review that brings back rules the learner missed
in grammar lessons. A review sitting contains at most ten due rules and asks
exactly one fresh bank exercise for each rule. A miss returns the rule the next
calendar day. Three correct reviews, separated by the schedule, clear the rule
from the weak-rule queue. A later lesson miss activates it again.

This is a bounded reinforcement loop, not a second vocabulary scheduler:

```text
lesson miss
    ↓ next local day
review 1 correct
    ↓ 3 local days
review 2 correct
    ↓ 7 local days
review 3 correct
    ↓
cleared until another lesson or review miss
```

The learner reviews a **rule**, never the exact prompt they just saw. Lesson
exercises introduce and assess material; the separate `bank.json` files supply
review prompts.

## 2. Why this is the next feature

The repository already contains every expensive input:

- every exercise has a stable `ruleId`;
- every available course has a separate `bank.json`;
- content validation requires at least two bank exercises per rule and forbids
  reusing lesson exercise ids;
- lesson attempts persist `missedRuleIds`;
- `Rule.anchorMd` explains the exact point after a miss;
- `GrammarQuestion`, `PracticeRuleCard`, `FocusShell`, study sittings and
  reliable idempotent client mutations already exist.

The missing behavior is the connection between those parts. This feature makes
mistakes actionable without adding a content authoring system, an AI provider,
a new navigation section or a generic learning-path engine.

The product pattern is established elsewhere: Duolingo exposes mistake review,
Busuu has Grammar Review, and Babbel adds lesson material to spaced review.
Research on second-language learning also supports retrieval practice with
corrective feedback and spacing. These sources support the direction, not the
exact schedule; the schedule below is deliberately sized for Slova's one-user
scope.

- <https://blog.duolingo.com/guide-to-duolingo-practice-hub/>
- <https://blog.busuu.com/busuu-launches-ai-powered-grammar-review/>
- <https://support.babbel.com/hc/en-us/articles/360037496932-Memorizing-vocabulary>
- <https://onlinelibrary.wiley.com/doi/10.1111/modl.12879>
- <https://eric.ed.gov/?id=EJ1420152>

## 3. Product outcome

After this ships:

1. A wrong answer in any grammar lesson schedules that rule for the next local
   day.
2. The Grammar catalog shows one prominent review action when rules are due.
3. Starting it produces a short mixed sitting across all available courses.
4. Every answer receives the same immediate feedback and rule explanation as a
   lesson question.
5. Correct reviews make the rule return less often; a miss resets it.
6. When nothing is due, the catalog has no empty review card and continues to
   be a course catalog.
7. Directly opening the review URL while caught up produces a useful caught-up
   state and the next review date, if one exists.

## 4. Scope

### 4.1 In scope

- Rules missed in available grammar courses.
- A cross-course due queue of up to ten rules.
- One bank exercise per rule per sitting.
- Calendar-day intervals in the learner's configured timezone.
- Immediate answer feedback and the rule anchor after a miss.
- A link from each reviewed rule to the first lesson that teaches it.
- Durable per-rule state, an idempotent answer log, and study-sitting metrics.
- Grammar Review activity in the streak and study calendar, labeled separately
  from a completed lesson.
- Historical backfill from existing `UserLesson.missedRuleIds`.
- Russian and English interface copy.
- Unit, integration and focused browser coverage.

### 4.2 Explicitly out of scope

- Full FSRS state for grammar.
- Scheduling individual exercises.
- Reviewing vocabulary mistakes, story questions or free writing.
- AI-generated exercises or explanations.
- A separate `/practice/grammar` product surface.
- A new sidebar item, Home screen, learning map, notifications or reminders.
- Manual rule selection, course filters or configurable session length.
- Undo for grammar-review answers.
- A permanent “mastered grammar” score or CEFR-level claim.
- Creating more course content as part of this implementation.

The existing `/practice/grammar` Coming Soon route is not reused. Grammar
Review belongs inside Grammar because it depends on course rules and course
content.

## 5. Terms

- **Weak rule:** a current content rule with an active memory row
  (`dueAt != null`). It may be due now or scheduled for later.
- **Due rule:** a weak rule whose `dueAt <= now`.
- **Cleared rule:** a row at stage 3 with `dueAt = null`. This is not a claim
  of permanent mastery; a later miss reactivates it.
- **Lesson miss:** a `ruleId` included in a completed lesson attempt's
  `missedRuleIds`.
- **Review miss:** an incorrect answer inside Grammar Review.
- **Bank exercise:** an exercise from the course's `bank.json`, never from a
  lesson pool.

User-facing copy should say “weak rules”, “needs review”, “reinforced” or
“cleared for now”. It must not say that a rule is permanently mastered.

## 6. Invariants

1. Grammar Review never changes `UserWord`, `ReviewLog` or vocabulary FSRS
   state.
2. A lesson miss can only activate a rule declared by the loaded course.
3. A review can only use an exercise from that course's review bank, and the
   exercise's `ruleId` must match the reviewed rule.
4. One sitting contains a rule at most once.
5. A successful answer mutation is idempotent by `operationId`.
6. A rule that another request has already moved out of the due queue is not
   advanced twice.
7. A content rule removed from the repository becomes inert; stale database
   rows never make a route fail.
8. All due and interval calculations use the learner's configured timezone,
   with UTC as the existing fallback.
9. No learner request calls an AI or audio provider.
10. The client may grade answers, as grammar lessons already do, but the server
    validates every content identifier before changing state.

## 7. Scheduling behavior

### 7.1 Constants

```ts
export const GRAMMAR_REVIEW_BATCH_LIMIT = 10;
export const GRAMMAR_REVIEW_CLEAR_STAGE = 3;
export const GRAMMAR_REVIEW_CORRECT_INTERVALS = [3, 7] as const;
export const GRAMMAR_REVIEW_MISS_INTERVAL_DAYS = 1;
```

`stage` means consecutive successful Grammar Review appearances since the most
recent miss:

| Current stage | Review result | Next stage | Next due |
|---:|---|---:|---|
| any | wrong | 0 | next local day |
| 0 | correct | 1 | +3 local days |
| 1 | correct | 2 | +7 local days |
| 2 | correct | 3 | cleared (`dueAt = null`) |

A lesson miss always resets `stage` to 0. Its due date is the earlier of:

- an existing due date, when the rule is already active; or
- the start of the next local calendar day.

This means a new lesson miss never postpones an already scheduled review. If
the rule is already due, it remains due now. If it was cleared, it returns the
next day.

### 7.2 Calendar days

Intervals are local calendar days, not 24-hour durations. A miss at 23:55 may
be reviewed after local midnight; it does not wait until 23:55 the following
day.

Add a pure helper beside the scheduler:

```ts
function dueOnCalendarDay(now: Date, timeZone: string, days: number): Date {
  const key = shiftCalendarDay(calendarDay(now, timeZone), days);
  return new Date(dateFromDayKey(key, timeZone, 0).getTime());
}
```

Reuse `calendarDay`, `shiftCalendarDay`, `dateFromDayKey`, `readTimeZone` and
`requestTimeZone`; do not add a date library or a second timezone cookie.

### 7.3 Why not FSRS

Vocabulary has hundreds or thousands of independently scheduled items and a
meaningful recall-probability model. The live grammar catalog currently has 25
rules across three courses, and Grammar Review is only correcting known weak
points. Three bounded successful returns are understandable, testable and
cheap to maintain.

Reconsider FSRS-like grammar scheduling only when both are true:

- at least 100 live rules exist; and
- actual use shows cleared rules are repeatedly missed weeks later.

## 8. Queue construction

Create `lib/courses/review.ts` for pure scheduling and selection, and
`lib/courses/review-store.ts` for Prisma reads and writes.

### 8.1 Loading due rules

`loadGrammarReviewQueue(userId, now, timeZone)`:

1. Read at most 50 active rows where `userId` matches and `dueAt <= now`,
   ordered by `dueAt ASC`, then `lastMissedAt ASC`, then `courseSlug ASC`, then
   `ruleId ASC`.
2. Load the current available-course catalog in memory.
3. Ignore rows whose course or rule no longer exists.
4. For each valid row, load that course's bank exercises for the rule.
5. Choose one exercise, preferring an id different from `lastExerciseId`.
6. Shuffle choice options with the existing `shuffleOptions` behavior.
7. Stop after ten distinct rules.

The database over-fetch of 50 is intentional: obsolete content rows must not
consume the ten visible places. With the current content size there is no need
for pagination or a more complex query.

### 8.2 Exercise choice

Selection rules:

- exactly one exercise per due rule;
- review-bank exercises only;
- no duplicate exercise id in a sitting;
- avoid `lastExerciseId` when at least two bank exercises exist;
- exercise and choice order may vary on refresh; there is no adversary and no
  persisted session manifest in the MVP.

The existing content validator already requires at least two bank exercises
per rule. Extend its tests to state that this is now a runtime dependency of
Grammar Review, not merely reserved future capacity.

### 8.3 Queue DTO

The Server Component passes a plain serializable array to the client:

```ts
type GrammarReviewItem = {
  memoryId: string;
  courseSlug: string;
  courseTitle: string;
  ruleId: string;
  ruleTitle: string;
  ruleAnchorMd: string;
  lessonSlug: string | null;
  lessonTitle: string | null;
  exercise: Exercise;
};
```

Do not pass Prisma objects, `Date`, `Map`, `Set` or content loader class/error
instances across the Server Component boundary.

### 8.4 Canonical lesson for a rule

Add a pure `lessonForRule(loadedCourse, ruleId)` helper. It returns the first
non-test lesson in course order whose theory block or lesson exercise names
the rule. Fall back to the first non-test lesson with an exercise for the rule,
then `null`.

This mapping supplies “Open full lesson” after a miss. It is derived from
reviewed content and does not belong in Postgres.

### 8.5 Catalog summary and next due date

`loadGrammarReviewSummary(userId, now)` returns:

```ts
type GrammarReviewSummary = {
  activeCount: number;
  dueCount: number;
  dueCourseTitles: string[];
  nextDueAt: Date | null;
};
```

Counts include only rows whose current course, rule and review bank still
exist. `dueCourseTitles` is distinct, in catalog order, and used only for the
catalog card copy. `nextDueAt` is the earliest future due date among valid
active rows and powers the direct caught-up state. Convert dates to strings
before passing them to a Client Component.

## 9. Data model

Add two tables. Content identifiers deliberately have no foreign keys to
course JSON, matching the existing course/story split.

```prisma
model GrammarRuleMemory {
  id         String @id @default(cuid())
  userId     String
  courseSlug String
  ruleId     String

  /// Consecutive successful review appearances since the latest miss: 0..3.
  stage Int @default(0)
  /// Null only after stage 3 clears the rule for now.
  dueAt DateTime?

  lastMissedAt  DateTime
  lastReviewedAt DateTime?
  clearedAt      DateTime?
  lastExerciseId String?

  reps    Int @default(0)
  lapses  Int @default(0)
  version Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs GrammarRuleReviewLog[]

  @@unique([userId, courseSlug, ruleId])
  @@index([userId, dueAt])
  @@index([userId, lastMissedAt])
}

model GrammarRuleReviewLog {
  id          String @id @default(cuid())
  operationId String @unique
  memoryId    String
  userId      String
  sittingId   String?

  courseSlug String
  ruleId     String
  exerciseId String
  correct    Boolean
  elapsedMs  Int?

  /// False means another request had already moved this rule out of the due
  /// queue. Recording the no-op makes retries idempotent.
  applied Boolean @default(true)

  ruleVersion  Int?
  previousStage Int?
  /// Resulting stage for an applied write, or observed current stage for a
  /// stale no-op. Kept non-null so an idempotent retry returns the same DTO.
  nextStage     Int
  previousDueAt DateTime?
  nextDueAt     DateTime?

  createdAt DateTime @default(now())

  memory GrammarRuleMemory @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  user   User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  sitting StudySitting?    @relation(fields: [sittingId], references: [id], onDelete: SetNull)

  @@unique([memoryId, ruleVersion])
  @@index([userId, createdAt])
  @@index([sittingId])
}
```

Also add relation fields:

```prisma
model User {
  // existing fields
  grammarRules   GrammarRuleMemory[]
  grammarReviews GrammarRuleReviewLog[]
}

model StudySitting {
  // existing fields
  grammarReviews GrammarRuleReviewLog[]
}
```

`ruleVersion` is nullable because a stale no-op did not produce a memory
version. Applied writes store `memory.version + 1`, allowing the same ordered
integrity check used by vocabulary reviews. A stale log stores the observed
current stage and due date in `nextStage` / `nextDueAt`, so every duplicate of
that operation returns the original stable response rather than whatever the
row happens to contain later.

### 9.1 Why keep a log

The log is not analytics infrastructure. It has three operational jobs:

1. make retries idempotent;
2. prevent two tabs from advancing the same due rule twice;
3. preserve enough evidence to diagnose a schedule that feels wrong.

There is no undo in this feature, so previous state is kept as scalar columns
rather than a full JSON snapshot.

## 10. Creating and reactivating weak rules

Extend `saveLessonProgress` inside its existing serializable transaction.
After the new `LessonAttempt` is accepted and before the transaction returns:

1. Validate `missedRuleIds` against `loaded.rules` as today.
2. For every unique missed rule, call
   `recordGrammarLessonMiss(transaction, userId, courseSlug, ruleId, now,
   timeZone)`.
3. Create a missing `GrammarRuleMemory` at stage 0, due next local day.
4. For an existing row, reset stage to 0, set `clearedAt = null`, update
   `lastMissedAt`, and move `dueAt` earlier only when needed.
5. Increment `version` with an optimistic `updateMany` guard. A conflict
   retries the serializable transaction.

The course-progress POST therefore needs the learner timezone. Read it inside
the route with `requestTimeZone()` and pass it to `saveLessonProgress`; do not
trust a timezone string in the JSON body.

Correct lesson answers do not advance or clear rule memory. Lessons introduce
and assess; only fresh bank prompts provide the repeated evidence that clears a
weak rule.

An idempotent retry of an existing `LessonAttempt.operationId` must return
before recording misses again, as the route already does for lesson progress.

## 11. Persisting a Grammar Review answer

Follow the existing vocabulary `persistReview` pattern in a new
`persistGrammarReview` function:

1. Begin a serializable transaction.
2. Find `GrammarRuleReviewLog` by `operationId`.
3. If it exists and all identity/result fields match, return the stored result
   with `duplicate: true`.
4. If it exists with a different payload, throw an idempotency conflict.
5. Load the current course and verify `ruleId` and `exerciseId` belong to its
   review bank and match one another.
6. Load the owned `GrammarRuleMemory` by `memoryId` and verify its user,
   course and rule identifiers.
7. If `dueAt` is null or later than `now`, write an `applied = false` log with
   the observed current stage/due date and return success with `stale: true`.
   This is the multi-tab guard.
8. Otherwise calculate the next pure schedule state.
9. Update with `where: { id, userId, version }` and increment `version`; retry
   the transaction on an optimistic conflict.
10. Write an applied log with previous/next state and the resulting version.
11. If `sittingId` belongs to the user, attach it and call `persistTouch` with
    `rating: correct ? "good" : "again"`, `allowEnded: true`.
12. Return the new stage, due date, whether it was cleared, and duplicate/stale
    flags.

A miss updates both `lastReviewedAt` and `lastMissedAt`. A correct answer only
updates `lastReviewedAt`. Every applied review sets `lastExerciseId`, increments
`reps`, and a wrong review increments `lapses`.

## 12. HTTP contract

Use a Route Handler rather than a Server Action because the existing
`useReliableMutations` retry/offline surface accepts HTTP endpoints and every
learning answer already follows this pattern.

The route reads `requestTimeZone()` beside the authenticated session and passes
the validated zone into persistence. The JSON body never supplies timezone.

### `POST /api/courses/review`

Request:

```json
{
  "memoryId": "cm...",
  "courseSlug": "present-simple",
  "ruleId": "ps-third-person-s",
  "exerciseId": "bank-ps-third-person-s-1",
  "operationId": "uuid",
  "correct": false,
  "elapsedMs": 5312,
  "sittingId": "cm..."
}
```

Validation:

- ids: non-empty, maximum 80 characters;
- `operationId`: UUID;
- `correct`: boolean;
- `elapsedMs`: optional number, clamped through `clampElapsedMs`;
- `sittingId`: optional non-empty string;
- authenticated user required.

Success:

```json
{
  "review": {
    "operationId": "uuid",
    "duplicate": false,
    "stale": false,
    "stage": 0,
    "dueAt": "2026-08-20T20:00:00.000Z",
    "cleared": false
  }
}
```

Errors:

| Status | Condition | Message key |
|---:|---|---|
| 400 | invalid JSON or shape | `invalidGrammarReview` |
| 401 | no session | `unauthorized` |
| 404 | memory/course/rule/exercise absent | `notFound` |
| 409 | operation id reused with a different payload | `invalidGrammarReview` |
| 500 | unexpected database/provider-independent failure | global route error |

Do not create a GET endpoint. The review page is a Server Component and reads
the queue directly.

## 13. Routes and component boundaries

```text
app/(app)/courses/grammar/page.tsx
  server: course catalog + due review summary in parallel

app/(app)/courses/grammar/review/page.tsx
  server: auth from parent layout, timezone, queue, next due date
  client: <GrammarReviewSession items={plainDto} />

app/api/courses/review/route.ts
  authenticated mutation only
```

Static `review/page.tsx` coexists with `[course]/page.tsx`; the static segment
wins. `review` must never be added to the course catalog or passed to
`loadCourse`.

The catalog Server Component should start course progress and review-summary
queries together with `Promise.all`. Pass only the due count, distinct course
titles and estimated minutes to the review card.

## 14. Catalog UI

Amend design-system section 15.5. The small-catalog order becomes:

```text
PageHeader
→ due Grammar Review card, when dueCount > 0
→ level bar
→ course list
→ Coming soon
```

The card is absent when nothing is due. Do not render a disabled or caught-up
card in the catalog.

Card content:

- overline: localized equivalent of “Review”;
- title: “Review weak rules”;
- one sentence: rule count, course count and estimated time;
- primary button: “Start review”;
- a restrained repeat/rotate icon, no illustration or metric-tile styling.

Use one compact `Card` with the normal catalog width. Do not add a tab,
dashboard grid, score ring or per-course review cards.

Estimated minutes are `max(1, dueCount)` with a maximum of 10. This is copy,
not a persisted metric.

## 15. Review session UI

Create `components/courses/grammar-review-session.tsx`. Reuse the lesson
practice geometry rather than creating a new player abstraction in the first
implementation.

### 15.1 Active question

- `FocusShell align="start"` and `container-focus`.
- `FocusTopBar`:
  - leading: back to Grammar;
  - progress: `LinearProgress`, current of total;
  - trailing: correct and missed counters.
- `FocusHead`: the existing task label or exercise prompt rules.
- `FocusPrompt` and `FocusAnswer`: existing `GrammarQuestion`.
- `FocusFooter`: existing `AnswerFeedback` and Next button.
- Below the footer: a review variant of `PracticeRuleCard`.

Before an answer, the rule panel may be opened manually. After a miss it opens
automatically and shows:

- course title;
- rule title;
- `Rule.anchorMd`;
- “Open full lesson” when `lessonForRule` produced a route.

Opening the lesson is a normal link in a new navigation, not an in-player
theory phase. The current sitting is abandoned through the existing hook.

Keyboard behavior remains identical to grammar lessons:

- `1`–`4`: choose;
- `Enter`: check / next;
- `R`: toggle the rule when focus is not in a field;
- `Esc` or the leading action: leave the sitting.

### 15.2 Per-answer persistence

On answer:

1. Grade locally with `gradeExercise`.
2. Update immediate UI counters.
3. Generate a UUID and submit `/api/courses/review` through
   `useReliableMutations`.
4. Build the body lazily so `getIdAsync()` can attach the grammar sitting.
5. Include elapsed time from `useStudySitting.elapsedMs()`.
6. Do not block the Next button on a normal network round trip.

Before showing the summary, call `flushMutations()`, then complete the sitting
with `score` and the unique rule ids missed during this sitting. Failed writes
remain visible through `MutationStatus` and its Retry action.

### 15.3 Summary

The summary contains:

- eyebrow: Grammar Review;
- title:
  - no misses: “Weak rules reinforced”;
  - any misses: “These rules will come back”;
- correct count out of total;
- if there were misses, a quiet sentence that they return the next local day;
- primary action: back to Grammar.

There is no “Again” button: correct rules are no longer due, and wrong rules
must be spaced until the next day. Repeating the same prompts immediately
would turn review into memorizing the sitting.

### 15.4 Empty and caught-up states

Direct route, no active rows ever:

- title: “No weak rules yet”;
- body: “Mistakes from grammar lessons will appear here for review.”;
- action: back to Grammar.

Active rows exist but none are due:

- title: “Caught up for today”;
- body includes the next due date in the learner's locale/timezone;
- action: back to Grammar.

Use `EmptyState variant="screen"`; no decorative statistics.

## 16. Study sitting and progress

Use the existing `StudySitting.kind = "grammar"` rather than adding a new
kind. Set:

```ts
{
  kind: "grammar",
  label: "review",
  sourceState: "all",
  setIds: []
}
```

Each applied answer updates sitting `reviews`, `goods` and `agains` through the
same `persistTouch` path as vocabulary. At completion, store percentage score
and this sitting's missed rule ids.

`getStudyActivity` does not currently read grammar sittings: it recognizes a
grammar day through `UserLesson.completedAt`, which would miss a day spent only
in Grammar Review. Extend it to read completed `StudySitting` rows with
`kind = "grammar"` and `label = "review"` inside the same activity window.

Add `grammarReviewDayKeys` to `StudyActivity`, include those timestamps in
`studiedAt`, and pass the keys to `StudyCalendar`. Calendar tooltips use a
separate localized “Grammar reviewed” phrase; they must not call a review
sitting “Lesson completed”. Extend the lightweight `getProgress` streak query
as well, so the line on Trainings recognizes a review-only study day.

No new chart, metric tile or dashboard card ships in this feature. Existing
grammar-review sitting counters remain available for later reporting.

Future progress reporting may use `GrammarRuleMemory` to show a quiet “rules
to review” count, but that is not part of the MVP.

## 17. Existing lesson UI changes

Keep lesson practice behavior intact. Only two visible changes are allowed:

1. If the completed sitting had misses, the summary adds one quiet sentence:
   “These rules will return for review tomorrow.”
2. The existing restart and back-to-lessons actions remain. Do not add a
   button that opens Grammar Review immediately, because newly missed rules
   are intentionally not due yet.

The course outline does not gain weak-rule badges in this version. The global
catalog card is the single entry point.

## 18. Internationalization

Add copy under a dedicated `grammarReview` namespace in both message files.
Keep generic task labels, correctness feedback, mutation status and common
buttons in their current namespaces.

Required concepts include:

- review eyebrow/title/description/action;
- due rule/course/minute plurals;
- caught-up and never-missed empty states;
- progress label;
- summary titles and next-day explanation;
- back to Grammar;
- API key `api.invalidGrammarReview`.

Do not put Russian UI strings in this plan or in code. Teaching fragments,
course titles and rule content retain their current language behavior.

Add `grammarReview` to `APP_CLIENT_NAMESPACES` because the session is a Client
Component. The catalog card may remain a Server Component and use the same
namespace server-side.

## 19. Accessibility

- Reuse `GrammarQuestion`, `OptionButton`, `AnswerFeedback`, `FocusShell` and
  their existing keyboard semantics.
- The result remains verbal and icon-based, never color-only.
- The progress bar has its existing accessible label.
- Counters and mutation status use `aria-live` as their existing components do.
- English course, rule and exercise fragments carry `lang="en"`.
- The automatically opened rule explanation must not steal focus.
- After an answer, focus moves to Next as in vocabulary practice.
- After Next, typed exercises autofocus their input through the existing
  component remount key.
- The catalog card is one coherent action region; avoid nested links.
- Direct empty states expose one clear navigation action.

## 20. Failure and concurrency behavior

### 20.1 Network failure

Answers update the visible sitting immediately. Mutations retry with the
existing bounded policy and flush before summary. If writes still fail, the
summary remains usable and `MutationStatus` offers Retry. An unsaved correct
rule may appear due again; that conservative failure is preferable to silently
discarding a miss.

### 20.2 Duplicate retry

The same `operationId` and payload returns success with `duplicate: true` and
the originally stored outcome. Reusing it for another rule, exercise or result
returns 409.

### 20.3 Two tabs

The first transaction moves the rule's `dueAt` into the future or clears it.
After serialization, the second transaction sees that the rule is no longer
due, records an idempotent `applied = false` log and returns `stale: true`.
It does not advance the stage twice.

### 20.4 Content changes

- Queue reads skip missing courses/rules/banks.
- Mutation validation returns 404 when a prompt from an old deployment no
  longer exists.
- Stale memory rows remain harmless and can be cleaned manually if needed.
- Renaming a rule id is a content migration: add a database update in the same
  release or deliberately let the old row go inert.

### 20.5 Timezone changes

Existing absolute `dueAt` values do not move when the timezone cookie changes.
The new timezone affects the next schedule calculation only. This matches the
daily-new-word decision: changing timezone changes future calendar boundaries,
not history.

## 21. Migration and historical backfill

Create the two tables and indexes in one additive migration. Backfill one
stage-0 row for every distinct `(userId, courseSlug, missedRuleId)` in existing
`UserLesson.missedRuleIds`.

Backfill behavior:

- `dueAt = migration time`, so historical weak rules are immediately
  reviewable;
- `lastMissedAt` is the maximum `COALESCE(UserLesson.completedAt, migration
  time)` across the grouped rows;
- duplicate rule ids across lessons collapse to one row;
- arbitrary string ids are acceptable for backfilled rows; use a stable
  `grm_` + hash value in SQL because Prisma's `cuid()` default is client-side;
- do not attempt to validate repository content in SQL; runtime queue loading
  ignores obsolete rule ids.

The migration is additive and safe to deploy before application code. The old
lesson progress path continues to work until the application begins writing
the new rows.

## 22. Rollout

No feature flag is necessary for the current one-user scope.

Deployment order:

1. Apply the additive production migration.
2. Deploy application code.
3. Open Grammar and verify the backfilled due card, if historical misses exist.
4. Complete a short review and verify rows/logs/sitting counters.
5. Miss a lesson rule and confirm it is due at the next local midnight, not
   immediately.

Rollback application code first. The additive tables can remain unused; do not
drop them in the rollback release. Remove them only in a later reviewed
migration if the feature is abandoned.

## 23. Implementation plan

### Step 1 — pure scheduler and queue selection

Files:

- add `lib/courses/review.ts`;
- extend `lib/courses/practice.ts` only if option shuffling must be exported;
- add `tests/unit/courses-review.test.ts`;
- extend course content tests for the runtime bank dependency.

Deliver:

- calendar-day due helper;
- lesson-miss reset calculation;
- correct/wrong transition calculation;
- distinct-rule queue selection;
- previous-exercise avoidance;
- canonical lesson mapping.

No Prisma imports in the pure module.

### Step 2 — schema, migration and store

Files:

- edit `prisma/schema.prisma`;
- add one migration directory;
- add `lib/courses/review-store.ts`;
- add database integration tests.

Deliver:

- memory/log tables and relations;
- historical backfill;
- due summary and queue reads;
- lesson-miss upsert;
- idempotent per-answer mutation with stale no-op behavior.

### Step 3 — connect lesson misses

Files:

- edit `lib/courses/progress.ts`;
- edit `app/api/courses/progress/route.ts`;
- extend `tests/unit/courses-progress.test.ts` where pure behavior changes;
- extend the existing course-progress integration coverage.

Deliver:

- request timezone passed into persistence;
- missed rules activated in the same transaction as the accepted lesson
  attempt;
- duplicate lesson operations remain no-ops.

### Step 4 — review mutation endpoint

Files:

- add `app/api/courses/review/route.ts`;
- add API error copy to both message files;
- add route security/unit coverage.

Deliver:

- authenticated Zod contract;
- content ownership validation;
- response/error mapping;
- sitting attachment and elapsed-time clamping.

### Step 5 — review page and session

Files:

- add `app/(app)/courses/grammar/review/page.tsx`;
- add `app/(app)/courses/grammar/review/loading.tsx` if the database read is
  visibly slower than the catalog path;
- add `components/courses/grammar-review-session.tsx`;
- adapt `components/courses/rule-card.tsx` with the smallest reusable link API;
- edit `app/(app)/layout.tsx` client message namespaces;
- add `grammarReview` copy to both message files.

Deliver:

- active, summary and both empty states;
- reliable per-answer mutations;
- grammar sitting lifecycle;
- keyboard and focus parity with lessons.

Do not extract a generic lesson/review player before both implementations prove
the same abstraction. Reuse leaf components first; duplication of orchestration
state is cheaper than a premature state-machine component.

### Step 6 — catalog entry and lesson summary copy

Files:

- edit `app/(app)/courses/grammar/page.tsx`;
- add `components/courses/grammar-review-card.tsx` or keep a small server
  component beside the page;
- edit `components/courses/lesson-player.tsx`;
- edit `docs/design-system.md` section 15.5.

Deliver:

- due-only catalog card;
- due/course/time summary;
- post-lesson “returns tomorrow” explanation after misses;
- no review card when caught up.

### Step 7 — progress integration

Files:

- edit `lib/progress.ts`;
- edit `components/progress/study-calendar.tsx`;
- edit progress copy in both message files;
- extend `tests/unit/progress.test.ts`.

Deliver:

- completed Grammar Review sittings contribute to streaks;
- the calendar distinguishes review from lesson completion;
- review-only days work in both the full Progress report and the compact
  Trainings progress line;
- no new progress card or chart.

### Step 8 — verification and rollout documentation

Files:

- unit and integration tests below;
- focused Playwright coverage if selectors remain stable;
- update `README.md` Screens only if Grammar Review is worth naming there.

Run:

```text
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

Then inspect the catalog, a choice question, a typed question, a miss-opened
rule, the summary and mobile focus mode in a real browser.

## 24. Test plan

### 24.1 Unit — scheduling

- New lesson miss becomes stage 0 and due next local day.
- A miss near midnight is due after local midnight.
- DST boundary calculation returns the correct local day.
- A new miss reactivates a cleared rule.
- A new miss never postpones an earlier active due date.
- Correct stage 0 schedules +3 days.
- Correct stage 1 schedules +7 days.
- Correct stage 2 clears with null due date.
- Wrong at every stage resets to 0 and next day.
- Reps/lapses/version scalar changes are correct.
- Invalid stage input is rejected or normalized only at the persistence
  boundary, never silently in the pure function.

### 24.2 Unit — queue and content

- At most ten distinct rules are selected.
- Oldest due rules win before the limit.
- Missing course/rule rows are ignored.
- Only bank exercises are used.
- `lastExerciseId` is avoided when another prompt exists.
- A single available prompt still works defensively, though content validation
  requires two.
- Choice options are shuffled without changing the answer.
- `lessonForRule` prefers a non-test teaching lesson.
- Every current available rule has a bank and canonical explanation anchor.

### 24.3 Integration — lesson miss activation

- Completing a lesson with one missed rule creates one memory row.
- Repeating the same operation id does not reset it twice.
- Two lessons missing the same rule keep one row.
- A later miss resets a cleared row.
- Invalid rule ids are filtered before persistence.
- Course progress and rule activation commit or roll back together.

### 24.4 Integration — review mutation

- Correct answer advances stage and writes an applied log.
- Wrong answer resets stage and increments lapses.
- Third correct answer clears the rule.
- Same operation and payload returns duplicate success.
- Same operation with different payload returns conflict.
- Wrong user cannot mutate the memory.
- Exercise from a lesson pool is rejected.
- Bank exercise for another rule is rejected.
- Missing/renamed content is rejected.
- A rule already moved out of due state writes a stale no-op and does not
  advance.
- Concurrent operations on the same due rule produce one applied and one stale
  log.
- Owned sitting receives one review counter update; foreign sitting id is
  ignored.
- Stale no-op duplicates return the originally observed stage and due date
  even if the memory changes again later.

### 24.5 Component/browser

- Catalog card appears only with a due rule and displays the correct count.
- Static `/review` route is not interpreted as a course slug.
- Choice and typed questions can be completed from the keyboard.
- A miss opens the rule without moving focus.
- “Open full lesson” reaches the canonical course lesson.
- The session asks each rule once.
- Summary waits for in-flight writes and exposes failed-write retry.
- There is no immediate restart action.
- Direct caught-up and never-missed states have the correct action.
- A review-only day contributes to the streak and has a distinct calendar
  tooltip from lesson completion.
- Mobile/tablet FocusShell does not overflow; sidebar behavior matches lessons.
- Accessibility scan has no new violations.

## 25. Acceptance criteria

- [ ] A wrong lesson answer creates or reactivates exactly one rule-level
      review item.
- [ ] Newly missed rules are not offered before the next local day.
- [ ] Grammar shows one review card only when at least one rule is due.
- [ ] A sitting contains at most ten rules and never repeats a rule.
- [ ] Every prompt comes from `bank.json`, not the lesson just completed.
- [ ] Correct results follow 3-day, then 7-day spacing, then clear the rule.
- [ ] A review miss returns the rule the next local day.
- [ ] A later lesson miss reactivates a cleared rule.
- [ ] Per-answer writes are idempotent and safe across two tabs.
- [ ] Network failures never block answering and remain visibly retryable.
- [ ] Grammar Review contributes to an ordinary grammar `StudySitting`.
- [ ] Removed content cannot break the queue.
- [ ] Russian and English UI copy, keyboard behavior and accessibility match
      the rest of Grammar.
- [ ] No LLM/TTS call, new navigation item or generic learning map is added.
- [ ] Unit, integration, lint, typecheck and production build pass.
- [ ] The implementation diff is reviewed before commit, per `CLAUDE.md`.

## 26. Risks and cheapest mitigations

| Risk | Early signal | Mitigation |
|---|---|---|
| Too few questions make a sitting feel trivial | Most sittings contain one rule | Keep one rule per day; do not pad with unrelated grammar. The honest sitting is one question. |
| Three successes clear a rule too early | Same cleared rules are missed again in later lessons | Measure reactivation; add a 21-day fourth stage before adopting FSRS. |
| Review card competes with course continuation | Learner always reviews and stops starting lessons | Card is due-only and compact; it does not replace or filter the course list. |
| Bank prompts become recognizable | `lastExerciseId` alternates between only two items | Add content per rule; do not generate runtime questions. |
| Historical misses overwhelm the first sitting | Backfill creates more than ten due rules | Oldest ten first; one sitting per day is optional, and the backlog remains finite. |
| Stale content rows accumulate | Many queue candidates are skipped | Add a manual cleanup script only when observed; no cron. |
| Player code diverges from lessons | Fixes must be made twice | Share leaf components now; extract orchestration only after a concrete repeated bug. |

## 27. Deferred extensions and triggers

- Add a 21-day fourth stage if rules cleared at stage 3 are often reactivated.
- Surface due grammar count on Progress only after Grammar Review has sustained
  use and the count answers a real question there.
- Add per-course filtering only when at least six live courses make mixed
  review confusing.
- Add notifications only when more than one learner asks for reminders.
- Consider sentence generation only when authored banks become the measured
  bottleneck and provider quality can be reviewed offline.
- Consider grammar FSRS only at the scale and failure trigger in section 7.3.

## 28. Open questions

None required for implementation. The decisions that materially affect scope
are fixed here: cross-course, rule-level, due-only entry, one prompt per rule,
three successful spaced reviews, separate bank content, per-answer persistence,
and no immediate repetition.
