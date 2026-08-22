# Plan — Reader, the "My texts" section

Status: steps 1–8 done on `feat/word-phrase-split`, not yet merged. The
migration is applied to development and to the E2E fixture; production is
still to do, per `docs/deployment.md`.
Source: brainstorm session 2026-08-22, first of four candidate sections.
Siblings: [Speaking](speaking.md), [Phrases](phrases.md), [Dialogues](dialogues.md).
Prerequisite: [one activity spine for Progress](progress-activity.md).

## 1. Why this one

The dictionary has exactly two mouths. You paste a list of words, or you tap a
word inside one of ten curated stories. Both are content somebody else chose.
The moment a learner reads anything of their own — a work email, a page of a
book, an article, the instructions on a box — the only route from that text
into the dictionary is retyping words into the import box by hand.

Stories already proved the shape of the answer: a text where words are
tappable, the meaning shown is the meaning *in this sentence*, and one tap
files the word with a schedule. What Stories cannot do is scale. Ten hand
authored packs, A1–A2, fixed. `content/stories/schema.ts` requires an author
for every annotation: `paragraphId`, `surface`, `occurrence`, `lemma`,
`glossRu`. Arbitrary text has no author.

The reading-research case for this is the strongest of the four candidates.
Comprehension of a text tracks the share of its words the reader already
knows: 95% coverage is roughly the floor for supported reading, 98% for
unassisted reading and for incidental vocabulary gain
([Hu & Nation](https://scholarspace.manoa.hawaii.edu/bitstreams/be187723-ba8b-433c-9472-b3b4ac847b86/download),
[Laufer & Ravenhorst-Kalovski](https://files.eric.ed.gov/fulltext/EJ887873.pdf),
[Kremmel et al. replication](https://onlinelibrary.wiley.com/doi/10.1111/lang.12622)).
That number is computable here and nowhere else in the app: the app knows the
whole dictionary and can count the text. It is the honest version of what the
Stories catalog already gestures at with its "yours / known / new" counts, and
it turns a pasted text into a decision — *this one is readable, that one is
not yet.*

The prior art agrees on one model. LingQ, Readlang and Lute all colour every
word by its learning status, keep the statuses across texts, and lift the
lemma to a parent term so `habló` inherits `hablar`'s definition
([Lute reading interface](https://deepwiki.com/LuteOrg/lute-v3/3.1-reading-interface),
[comparison](https://lingochampion.com/en-US/lingq-alternatives/)). Slova
already has all three parts: `UserWord` is the status, `ratingOf` is the
colour, `normalizeKey` is the parent term. What is missing is the text.

## 2. Scope

**In:** paste a text, keep it, read it with every word tappable and coloured
by dictionary status, see coverage before you start, open the meaning of a
word in its sentence, add it to the dictionary in one tap, delete the text.

**Out — build nothing that needs these:**

- **Fetching a URL.** Paywalls, boilerplate stripping, and a server-side
  fetcher pointed at arbitrary hosts. Paste is the whole intake for v1.
- **PDF / EPUB / DOCX upload.** Same reason, more parsing.
- **Audio for a whole text.** `/api/audio` is capped at 200 characters per
  request and exists to fill missing lexeme audio, not to narrate.
- **Comprehension questions.** Three questions end a Story because a human
  wrote them against a known text. Generating them is a different feature with
  a different failure mode.
- **Sharing a text with another account, or any public text library.** Pasted
  text is somebody else's copyright as often as not; private and per-account is
  the only defensible position.
- **A second language.** `STUDY_SOURCE_LANG` / `STUDY_TARGET_LANG` stay as
  they are.

## 3. Success criteria

- [x] A 500-word paste renders in the reader in under 2s (p95, warm) with
      **zero** model calls when every word is in the shared base.
- [x] Coverage is computed over every running word in the text, not only over
      words that happen to be in the shared base, and matches a hand count on
      the two fixture texts within 1 percentage point.
- [x] `went` matches the `go` in the dictionary; `cities` matches `city`.
      Verified by fixture, not by eye.
- [x] Adding a word from the reader creates exactly one `UserWord`, tagged
      `source: "text:<id>"`, and is idempotent on a second tap.
- [x] A contextual gloss is requested only when the learner asks for it, is
      cached on the text so a second tap is free, and is refused when the
      durable LLM budget says no.
- [x] Texts are included in `npm run account:data` export and are destroyed by
      its delete path — `tests/integration/account-data.test.ts`, run green.
- [x] `npm test`, `npm run lint`, `npm run typecheck` green; the reader has
      been opened in a browser on a phone-width viewport before it is called
      done.

## 4. Context found in the codebase

| What | Where | Why it matters |
|---|---|---|
| Annotated reading | `components/stories/story-reader.tsx` (435 lines) | The popover, the add-word affordance, the keyboard behaviour — all of it is already designed and shipped. Copy the interaction, do not redesign it. |
| Segment building | `lib/stories/reader-view.ts:buildParagraphSegments` | Splits a paragraph into text runs and tappable spans, outer span wins. The text reader needs the same output type from a different input. |
| Dictionary state | `lib/stories/reader-view.ts:dictionaryStateOf`, `lib/word-rating.ts:ratingOf` | Three states already defined: `absent` / `learning` / `known`. This is the colour model the prior art converged on. |
| Add one glossed word | `app/api/stories/[slug]/words/route.ts` | The exact contract to mirror: shared base first, contextual gloss only as the learner's own `back`, `source` tag, `addWords` idempotence, fixed-window rate limit. |
| Shared base lookup | `lib/lexicon/lookup.ts:lookupBatch` | One round trip for a whole list of keys. This is what makes a whole text free. |
| Paid translation | `lib/llm/translate-batch.ts` | One request for all misses, results written back to the shared base. A word missing from a pasted text is paid for once, for everyone. |
| Durable budget | `lib/llm/budget.ts:reserveLlmUsage` / `reconcileLlmUsage` | Reserve before calling, reconcile after; failed attempts stay reserved. Any new model path goes through it. |
| Key normalisation | `lib/lexicon/key.ts:normalizeKey` | The one definition of "same word" across `UserWord` and `Lexeme`. The tokenizer must produce keys through it, never its own. |
| Irregular forms | `lib/lexicon/forms.ts`, `Lexeme.forms` | `went → go` is already in the base for the irregular set; the lemmatizer should defer to it rather than guess. |
| Nav | `lib/nav.ts`, `tests/unit/nav.test.ts` | Sections are data with a tested matcher. Adding one is a two-line change plus i18n keys. |
| Per-user progress on repository content | `StoryProgress` | The precedent for "loose reference, no foreign key". `UserText` is the opposite case — the content *is* user data — which is exactly why it needs the export/delete path Story progress does not. |

Constraint discovered while reading: `CLAUDE.md` forbids hand-rolled controls
and hardcoded values; the popover and the list rows come from shadcn/ui, and
every colour goes through `app/globals.css` tokens. `docs/product-scope.md`
forbids queues and background workers — so tokenization happens inline in the
request that saves the text, and must therefore be fast enough to.

## 5. Design

**Chosen: tokenize on save, colour from the dictionary, gloss on demand.**

Saving a text keeps the body and its counts. Opening it runs the tokenizer —
paragraphs, tokens with character offsets, and a lemma key per token via
`normalizeKey` — which step 1 measured at 10 ms for the largest text the caps
allow, against 226 KB of JSON to store the same answer. Rendering does two
queries — `lookupBatch` over the unique keys for the shared-base
translation, and one `UserWord` query for this reader's statuses — and paints
every token by status. Tapping a word opens the popover with the base
translation immediately, from data already on the page. Only the explicit
"meaning in this sentence" action calls a model, and only for that one
sentence.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| **A (chosen)** — tokenize + lookup, gloss on demand | Tokenizer at save, two queries at read, model only on request | Contextual glosses are one tap away instead of free; needs a lemmatizer | Cost scales with curiosity, not with text length. Matches the README's rule that the base is the answer and the model is the miss. |
| B — LLM annotates the whole text on save | One model call produces a story-shaped annotation set | Every paste costs tokens proportional to its length, whether or not a single word is tapped; the offsets then have to be validated against the text like `lib/stories/validate.ts` does | Rejected: pays for 500 words to serve the 12 the reader actually stops on. |
| C — no lemmatizer, exact surface keys | `normalizeKey(surface)` and nothing else | Free and trivial; `went`, `cities`, `running` all miss | Rejected: it makes the coverage number a lie, and coverage is the reason this section exists. |

**What would change this decision:** if the tokenizer spike in step 1 shows
lemma accuracy bad enough that coverage is off by more than a couple of points
on ordinary prose, B becomes worth its cost — the model would then be buying
correctness, not convenience.

**The lemmatizer.** One new dependency, and it needs justifying.
[`wink-nlp`](https://github.com/winkjs/wink-nlp) with the English lite model:
POS-aware lemmas, ~94.7% POS accuracy on a WSJ subset, and it runs in plain
Node — which matters, because `lib/nav.ts`'s comment records that this repo
keeps libraries out of testable pure modules on purpose. **The published ~10 KB
figure is the library, not the language model, which ships as a separate
package; the installed weight of both together is unverified and step 1
measures it** before the dependency is accepted.
`compromise` is the alternative at ~250 KB and rule-based accuracy
([comparison](https://www.pkgpulse.com/guides/natural-vs-compromise-vs-wink-nlp-javascript-nlp-2026)).
It stays **server-side only**: the tokenizer runs in the route handler that
saves the text, never in the client bundle. Resolution order per token is
`normalizeKey(surface)` → the `Lexeme.forms` irregular table → the wink lemma,
so the curated data outranks the library wherever it exists.

**Touches:** one new model and migration (`UserText`), four route handlers,
two pages, one nav entry, one dependency, one i18n namespace, and one line
each in `docs/security.md` and the privacy page for the sentence that reaches
Anthropic when a gloss is requested.

### 5.1 Data model

```prisma
/// A text this person pasted, read through a tokenization that is recomputed
/// rather than stored. Unlike StoryProgress, the content itself is user data:
/// it is exported and destroyed by the account workflow, and it never leaves
/// this account.
model UserText {
  id     String @id @default(cuid())
  userId String

  title String
  body  String

  /// Contextual glosses the reader asked for, by token id. The one thing here
  /// `body` cannot rebuild — step 1 measured the tokenizer at 10 ms for a text
  /// at the cap, against 226 KB of JSON to store its output.
  glosses Json @default("{}")

  wordCount Int
  charCount Int

  lastReadAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
}
```

Caps, enforced in the route and asserted in a test: **20 000 characters** per
text, **20 texts** per account. Not a quota system — two constants and a 400,
in the spirit of `docs/product-scope.md`.

Contextual glosses are cached in `glosses` under the token id, so the second
tap on the same word costs nothing and a text carries its own gloss history.
Token ids are `paragraph:index`, which the tokenizer reproduces from `body`
deterministically; a change to the tokenizer that moved them would strand a
cached gloss, so `lib/texts/tokenize.ts` keeps `PARSED_VERSION` as the marker
for exactly that.

### 5.2 API surface

| Route | Does | Guards |
|---|---|---|
| `POST /api/texts` | Save and tokenize. Returns `{ id }`. | auth, zod, size caps, `allowFixedWindowAttempt("texts-create:<user>", 20, 1h)` |
| `DELETE /api/texts/[id]` | Delete. | auth, ownership via `lib/ownership.ts` |
| `POST /api/texts/[id]/words` | Add one token to the dictionary. Mirrors the Stories route exactly, `source: "text:<id>"`. | auth, ownership, 40/hour |
| `POST /api/texts/[id]/gloss` | Contextual gloss for one token in its sentence. Caches into `glosses`. | auth, ownership, 60/hour, `reserveLlmUsage` / `reconcileLlmUsage` |

Words missing from the shared base are **not** resolved at save time. They
render as "no translation yet" and the gloss action is the paid path for
them — which keeps a 20 000-character paste from being a bill.

## 6. Steps

Risk-ordered. Each leaves the app shippable.

### 1. Spike the tokenizer, lemma and coverage — M · `[x]`

- **Why first:** this is the whole design. If lemma quality is poor, approach B
  wins and everything downstream changes shape.
- **Files:** `lib/texts/tokenize.ts` (new), `lib/texts/lemma.ts` (new),
  `lib/texts/coverage.ts` (new), `tests/unit/texts-tokenize.test.ts` (new),
  `tests/fixtures/texts/*.txt` (new, two texts: one A2 narrative, one news
  paragraph with numbers, quotes and a hyphenated compound).
- **Does:** paragraph split, token offsets, `normalizeKey` + irregular-table +
  wink lemma resolution, and a pure coverage function over a dictionary.
  Nothing renders, nothing is stored.
- **Verify:** `npm test` — fixtures assert `went→go`, `cities→city`,
  `don't` stays one token, `e-mail` stays one token; coverage on each fixture
  within 1pp of the hand count recorded in the test. Log the tokenization time
  for a 20 000-character input; if it is not comfortably inside the request,
  say so here before continuing.

**What it measured.** `wink-nlp` 2.4.0 plus `wink-eng-lite-web-model` 1.8.1
weigh **4.6 MB installed** — 772 KB library, 3.8 MB model — against the ~10 KB
the library advertises for itself. Server-side only, so it costs disk in the
function bundle and nothing in the browser. Accepted on that basis.

Lemma quality on the fixtures is good enough that approach B stays rejected:
`went→go`, `saw→see`, `slept→sleep`, `cities→city`, `children→child`,
`bought→buy` all resolve, and POS keeps `a saw` a saw. `data→datum` is the one
visible miss, and it costs nothing because a token counts as known on its
surface key *or* its lemma. Coverage on the narrative fixture is 55 of 58
running words, which is the hand count exactly.

Tokenizing the full 20 000-character cap takes **10 ms** (3 196 words, 178
paragraphs); loading the model costs 35 ms once per process. Comfortably
inside the request, as required.

**One thing the measurement changed.** The tokenizer output for that same
20 000-character text is **226 KB of JSON**, or 103 KB with the token id and
key derived rather than stored — five to eleven times the 20 KB body it came
from, for something the 10 ms above can rebuild. So it is not stored at all;
§5.1 records what replaced it.

### 2. Store a text and list it — M · `[x]`

- **Files:** `prisma/schema.prisma` (`UserText`) + `npx prisma migrate dev`,
  `app/api/texts/route.ts` (new), `app/api/texts/[id]/route.ts` (new),
  `app/(app)/texts/page.tsx` (new), `components/texts/text-composer.tsx` (new,
  built from the shadcn primitives `components/add-words-panel.tsx` uses),
  `lib/nav.ts`, `lib/i18n/*`, `tests/unit/nav.test.ts`.
- **Does:** paste, title (defaulted from the first line), save, list, delete.
  The section appears in Study, under Stories.
- **Verify:** `npm test` for nav and caps; then `npm run dev`, paste a real
  article, see it in the list, delete it.

### 3. Render the reader, read-only — M · `[x]`

- **Files:** `app/(app)/texts/[id]/page.tsx` (new),
  `app/(app)/texts/[id]/loading.tsx` (new),
  `components/texts/text-reader.tsx` (new), `lib/texts/reader-view.ts` (new).
- **Does:** server component tokenizes `body`, runs `lookupBatch` and one
  `UserWord` query, hands the client a token list with statuses. Every word is
  coloured `absent` / `learning` / `known` through tokens. No popover yet.
- **Verify:** browser, phone width and iPad width — the two viewports
  `app/dev/viewport` exists for. A 500-word text paints without visible reflow;
  check the render time in the server log against the 2s criterion.

### 4. Tap a word: popover, base translation, add to dictionary — M · `[x]`

- **Files:** `components/texts/text-reader.tsx`,
  `app/api/texts/[id]/words/route.ts` (new),
  `tests/unit/texts-words-route.test.ts` (new).
- **Does:** the Stories popover interaction against text tokens; add writes
  through `lib/words/add.ts` with `source: "text:<id>"`, and the token restyles
  to `learning` without a reload.
- **Verify:** unit test for idempotence and the ownership 404; browser check
  that the added word appears in My words with the right source.

### 5. Contextual gloss on demand — M · `[x]`

- **Why here:** the first paid path in the section, and it lands only once the
  free ones work.
- **Files:** `app/api/texts/[id]/gloss/route.ts` (new), `lib/llm/prompt.ts`
  (one prompt beside the translation prompt), `lib/texts/gloss-cache.ts` (new),
  `tests/unit/texts-gloss.test.ts` (new).
- **Does:** sends one sentence and one target word, stores the answer into
  `glosses`, returns it. Budget reserved before the call and reconciled after,
  the same as `translate-batch`.
- **Verify:** unit test with a stubbed client for cache-hit / budget-refused /
  provider-error; `npm run budget:status` shows the reservation moving.

Run against the real provider on 2026-08-22: `saw` in *they saw the old bridge*
came back **увидели**, not «пила», for 346 input and 11 output tokens, one
request, reconciled onto both the user's `LlmUsage` row and the global one. The
second tap after a reload answered `cached: true` with no model call, and
adding the word from that gloss filed `see → увидели` with `source: text:<id>`.

### 6. Coverage header and the states around it — S · `[x]`

- **Files:** `components/texts/text-coverage.tsx` (new),
  `app/(app)/texts/page.tsx`, `lib/texts/coverage.ts`.
- **Does:** the percentage and the "yours / new" split on the list card and
  above the reader, with the 95/98 thresholds as the wording ("readable with
  help" / "readable"). Empty state for no texts; the first-paste hint.
- **Verify:** unit tests for the threshold wording at 94.9 / 95.0 / 98.0;
  browser check of the empty state.

### 7. Account export, delete, and the privacy line — S · `[x]`

- **Files:** `lib/account-data.ts`, `docs/security.md`, `app/(public)/privacy`,
  `tests/unit/account-data.test.ts`.
- **Does:** texts in the export, destroyed by the delete path, and one honest
  sentence about a sentence being sent to Anthropic when a gloss is asked for.
- **Verify:** `npm run account:data` against the seeded demo account, before
  and after a paste.

Steps 1 and 2 are sequential. 5, 6, 7 and 8 are independent of each other
once 4 has landed.

## 7. Risks

| Risk | Noticed by | Cheapest resolution |
|---|---|---|
| Lemma errors make coverage dishonest | Fixture assertions in step 1 | The spike *is* the experiment; it happens before anything is built on it |
| A 20 000-character paste blows the request budget | Timing logged in step 1 | Lower the cap; it is a constant |
| Gloss requests become a cost leak | `npm run budget:status`, `LlmUsage` rows | Already covered by reserve/reconcile plus the hourly limiter; no new mechanism |
| Pasted text contains personal data and a sentence of it reaches a provider | Nothing will report this — it has to be designed for | Only the sentence around the tapped word is sent, never the whole text; stated in the privacy page in step 7 |
| Pasted text is somebody else's copyright | — | Private per account, no sharing, no library. This is the reason those are non-goals rather than a later phase |
| The Stories reader and the text reader drift into two designs | Review | Deliberately deferred, not ignored: see §8 |

**Rollback:** the migration is additive and the model is new, so `DROP TABLE`
undoes it with nothing else to unwind. No flag: nothing here changes an
existing screen. The section can be hidden by removing its `lib/nav.ts` entry
in a one-line commit while the routes stay live.

## 8. Progress

Reading a text touches neither `UserWord` nor `ReviewLog`, exactly like a
story — so without deliberate work, **a day spent only reading shows an empty
square on the calendar and resets the streak to zero.**
`lib/progress.ts:getStudyActivity` carries a comment recording that this
already happened once, for stories. See [the activity spine
plan](progress-activity.md), which is a prerequisite for the step below.

What Reader adds beyond merely not breaking things: coverage is a number this
app can now show *over time*. "The texts you read this month averaged 93% of
words you know" is a genuinely new statement about a learner, and it is the
one metric no other section can produce.

### 8. Wire the reader into Progress — S · `[x]`

- **Why last but not optional:** the section is not finished until this lands;
  see [progress-activity.md §6](progress-activity.md).
- **Files:** `lib/sitting.ts` (a `reading` kind), `components/texts/text-reader.tsx`
  (opens and closes a sitting the way a training does),
  `lib/progress.ts`, `components/progress/metric-tile.tsx`,
  `app/(app)/progress/page.tsx`, i18n, `tests/unit/progress-activity.test.ts`.
- **Does:** a reading session writes a `StudySitting` with a real
  `durationSec` and zeroed review counters, so reading colours its own square,
  counts for the streak, and appears on the per-kind minutes split. Adds two
  tiles: words read in the window, and mean coverage of the texts read.
- **Verify:** the parameterised streak test gains `reading`; then read a text
  and confirm on Progress that the square is coloured and the minutes are
  right.

## 9. Deferred, captured on purpose

- **Unifying the two readers.** `components/stories/story-reader.tsx` and
  `components/texts/text-reader.tsx` will overlap by a lot. Extracting shared
  primitives before the second one exists means designing the abstraction
  against one example; doing it after means one refactor with both in view.
  Do it after, as its own branch.
- **URL intake**, once there is a reason to own a fetcher and a boilerplate
  stripper.
- **A text as a study source.** Sets are tags; a text could be one, and the
  Trainings source picker could offer "words from this text". Natural next
  step, out of this batch.
- **Re-reading and a reading streak.** `lastReadAt` is stored from day one so
  this stays available without a migration.

## 10. What the build found

Three things the plan did not predict, each settled in the code:

**Coverage needed a floor to mean anything.** `UserWord` holds what somebody
chose to study, which is never `the`, `of` or `and`; counted against it alone
an A2 narrative scores 12% and the 95/98 thresholds in §1 say nothing. A word
now counts as known when it is in the dictionary **or** among the first 500 of
`content/lexicon/en-frequency.txt`, and `/texts` says so in a footnote rather
than passing the assumption off as a measurement. The same fixture then reads
72% on the baseline alone and 100% once its content words are in the
dictionary. That list has no single-letter entries, so `a` and `I` — the first
and among the commonest words in English — are added by hand in
`lib/texts/known-words.ts`.

**Marking every absent word underlines the whole page.** §5 says "coloured by
dictionary status", and the first render showed why that cannot mean three
marks: with a small dictionary nearly every word is absent, and a page of
dotted underlines is not a reading surface. Only dictionary words are marked
now — `data-learned` for learned, `data-learning` for learning, nothing for
the rest — and `docs/design-system.md` §15.9 records the rule and the reason.

**A reading sitting had no way to record its time.** `durationSec` only
advances on a patch, and reading sends none, so every reading sitting would
have closed at zero and coloured nothing. The reader now beats every 30
seconds while the tab is visible, and `didWork` counts a reading sitting on
duration alone (20s) since it has no reviews to show for itself. A text left
open in a hidden tab adds nothing, which is the point.

## 11. What recomputing costs, measured

§5.1 chose to rebuild the tokenization on every read rather than store it. The
bill, measured on this branch (warm process, one core):

| | |
|---|---|
| One text at the 20 000-character cap, tokenize + lemma + coverage | **6.7 ms** |
| One typical 3 000-character text, same | **0.9 ms** |
| `/texts` list, 20 texts at the cap — the worst case the caps allow | **124 ms** |
| `/texts` list, 20 typical texts | **18 ms** |
| `JSON.parse` of the stored blob it would replace | 0.6 ms |

The last two rows are the argument. Storing would save ~6 ms of CPU per text
and cost a 226 KB read; across a full list that is **4.5 MB out of Postgres to
avoid 124 ms of CPU**, which is slower over a serverless connection, not
faster. Recomputing also has no `parsedVersion`, no regeneration path, and no
migration the day the tokenizer improves.

The tokenizer itself is 0.8 ms of that; the other 90% is wink. Loading the
model costs 35 ms once per process, which is the cold-start tail rather than a
per-request cost.

**If the caps ever rise**, the multiplier is the list page and Progress, the
two screens that tokenize every text rather than one. The cheapest fix then is
an in-process memo keyed by `id:updatedAt` — free on a warm instance, nothing
to invalidate, no column. Not worth the code at 18 ms.
