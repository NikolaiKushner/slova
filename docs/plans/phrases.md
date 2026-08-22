# Plan — Phrases: chunks as a first-class unit

Status: proposed, not started. Branch: `feat/phrases`.
Source: brainstorm session 2026-08-22, third of four candidate sections.
Siblings: [Reader](shipped/reader.md), [Speaking](speaking.md), [Dialogues](dialogues.md).
Prerequisite: [one activity spine for Progress](shipped/progress-activity.md).

## 1. Why this one, and what it actually needs

Slova teaches one word at a time. English does not work that way: *give up*,
*look after*, *make a decision*, *take a photo* are single meanings wearing
several words, and the learner who knows *give*, *up*, *make* and *decision*
still cannot produce any of them.

**The surprise is how little engine work this needs.** Reading the code first
changed the shape of this plan entirely:

- `lib/lexicon/dataset.ts:kindOf` already classifies any text as `word` or
  `phrase` on whether it contains a space, and `Lexeme.kind` already stores it.
- `lib/practice/distractors.ts` already matches distractors by *shape*, so a
  phrase question is never offered a single word as a decoy.
- `lib/practice/question.ts:236` already splits builder tiles into **words**
  for a phrase and letters for a word — the comment in the `Question` type
  says so out loud: *"letters of a word, words of a phrase"*.
- `normalizeKey` collapses whitespace and lowercases, so `Give Up` and
  `give  up` are one key; `audioObjectKey` already turns spaces into
  underscores, and twenty-seven recordings with spaces in the name already
  exist.

A phrase typed into the import box today is learned, scheduled and drilled
correctly by all six formats. **The mechanism shipped a long time ago and
nobody built the way in.**

So this plan is not "add a second learnable unit". It is three things: a
curated bank worth learning, a place to add it from, and the one question
format a phrase genuinely needs and the engine does not have.

## 2. The content is the feature

A phrase list assembled by taste is worthless — and the polysemy is the trap.
The **PHaVE List** (Garnier & Schmitt, *Language Teaching Research* 2015) is
the 150 most frequent phrasal verbs *with their key meaning senses*, because a
phrasal verb has **5.6 meaning senses on average**, and the listed senses
cover 75%+ of that verb's occurrences in COCA
([paper](https://journals.sagepub.com/doi/10.1177/1362168814559798),
[ERIC record](https://eric.ed.gov/?id=EJ1075475),
[the author's resource page](https://www.norbertschmitt.co.uk/vocabulary-resources)).

That number is the whole editorial argument. *Get up* has a meaning we teach
and five we do not. A card that says `get up — вставать` is honest only if the
card is *about that sense*. So the unit here is **phrase + sense**, not
phrase — and since `UserWord` is keyed on `normalizeKey(front)`, two senses of
one phrasal verb cannot both live in the dictionary. §4 is where that gets
resolved, and it is the one real design decision in this plan.

### 2.1 The free path, and why it is also the better one

**Nothing here is licensed, bought, or negotiated.** The distinction that makes
that possible is worth stating precisely, because it decides what may be typed
into the JSON:

- **Which phrasal verbs are frequent, and roughly in what order, is a fact.**
  Facts are not somebody's property. PHaVE can be read the way one reads a
  reference — to check that *give up* outranks *chalk up*, and that the sense
  we teach for *get up* is the dominant one — without any of it being copied.
- **PHaVE's sense definitions, its example sentences, and its particular
  selection and arrangement are the authors' work.** None of those are
  reproduced. Not the definitions, not the examples, not the list as a list.

So the pack is written here: the Russian gloss is ours, the example sentence is
ours, and the ordering is checked against a source we already own —
`content/lexicon/en-frequency.txt` and the 8,000-lexeme shared base — rather
than copied from anyone. That is free, unambiguous, and needs no `SOURCE.md`
negotiation; it needs one honest paragraph saying published frequency research
informed the selection and that no data was reproduced from it.

It is also the better outcome on quality, not merely the cheaper one. A gloss
written for this app can say the thing the way the rest of the app says
things, in the register the other 8,000 translations already use, and the
example sentence can be built from vocabulary the learner is likely to have —
which a borrowed sentence cannot. The one thing PHaVE genuinely supplies is the
judgement about *which sense* is dominant, and that is exactly the part that
travels as a fact.

**The one rule that must hold while writing:** if a sentence or a definition
was read somewhere, it is rewritten from the meaning, not adapted phrase by
phrase. Sixty entries is small enough for that to be honest work rather than a
formality.

## 3. Scope

**In:** a curated bank of high-frequency phrasal verbs and everyday
collocations, one sense per entry, with a Russian gloss and an example
sentence; a catalog screen to add a pack from; a cloze format so a phrase is
asked in a sentence; the existing FSRS schedule, untouched.

**Out:**

- **A new model, a new schedule, a new queue.** A phrase is a `UserWord`. Any
  step that starts by adding a table is off-plan.
- **Idioms.** Low frequency, high cultural load, and a different kind of
  gloss. *Kick the bucket* is not A2.
- **Automatic phrase extraction** from texts or the lexicon. That is a corpus
  project; the bank is curated.
- **Teaching separability** (*turn it off* vs *turn off it*). That is a grammar
  course, and the grammar shelf is where it belongs.
- **Recordings for every phrase.** `/api/audio` can fill them on demand where
  the flag allows; nothing here mints audio in bulk.

## 4. The sense problem, and the decision

`UserWord` has `@@unique([userId, key])`. `normalizeKey("get up")` is one key.
Two senses of *get up* cannot coexist.

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| **A (chosen)** — one sense per phrase in the bank | The bank ships the **single most frequent sense** per phrasal verb, and the card's `back` carries only that gloss | Cannot teach a second sense later without changing the key | Correct for A1–A2, where a learner needs the dominant sense of 60 phrases far more than three senses of 20. The PHaVE percentages are exactly the data that decides which sense that is |
| B — key includes the sense (`get up#1`) | A suffix in `front`/`key` | Every screen that displays `front` has to strip it; a word's key stops being the word | Rejected: it corrupts the one identity the whole app shares |
| C — a `sense` column and a compound unique | Schema change, migration | Correct, and it changes the dedup rule for every word in the app to serve a minority of entries | Rejected for this batch; §8 keeps it |

**What would change this decision:** a B1+ pack, where a second sense of a
common phrasal verb is genuinely the next thing to learn. Then C, deliberately,
as its own plan.

The example sentence is what carries the sense at review time, which is why
step 3 exists: a phrase drilled without a sentence is a phrase drilled without
its meaning.

## 5. Design

**Chosen: a content pack plus a catalog screen, reusing the entire learning
engine, with one new question format.**

The bank is JSON in `content/phrases/`, structured and validated like
`content/stories/` and `content/courses/` — imported, not read from disk, so
it travels with the serverless bundle (`lib/stories/load.ts` records why).
Adding a pack writes ordinary `UserWord` rows through `lib/words/add.ts` with
`source: "phrases:<pack>"`, and from that instant the phrase behaves exactly
like every other entry: the six formats, the Brainstorm ladder, the FSRS
schedule, My words, sets.

The one addition is **cloze**: a sentence with the phrase blanked, four
options. It is the format a chunk needs — see §2's polysemy argument — and it
is a small addition to `question.ts` because the multiple-choice branch is
already there; what is new is that the prompt is a sentence with a gap and the
distractors are other phrases from the same pack.

**Where it lives.** `app/(app)/dictionary/catalog/page.tsx` today is
`<ComingSoon page="readyMade" />` — the shelf was already promised and already
routed. The packs land there, which means **this may not need a new nav entry
at all**. A Phrases section is justified only if the packs become a browsing
experience of their own; step 5 decides that with the screen in front of us,
rather than now.

**Touches:** new content directory and schema, one loader, one route handler,
one page replacing a stub, one question kind, i18n, `NOTICE`/`SOURCE.md`. No
migration.

## 6. Steps

### 1. Pick the sixty, and write down where they came from — S · `[ ]`

- **Why first:** the selection is the one decision the rest of the pack cannot
  be changed around cheaply, and §4's one-sense-per-phrase rule means picking
  the phrase and picking its sense are the same act.
- **Files:** `content/phrases/SOURCE.md` (new), `content/phrases/selection.md`
  (new — the sixty with their chosen sense, one line each, before any JSON).
- **Does:** settles the list and the sense per entry, ordered by frequency
  checked against `content/lexicon/en-frequency.txt` and the shared base.
  `SOURCE.md` states, in one honest paragraph, that published frequency
  research informed the selection and that no definitions, examples or lists
  were reproduced from it — see §2.1. **`NOTICE` is not touched and the MIT
  licence needs no new carve-out**, which is the whole point of taking this
  route.
- **Verify:** the sixty read as a list a learner would want, and each line
  names one sense, not a phrase. No code, no JSON.

### 2. Schema, loader and validator for a pack — M · `[ ]`

- **Files:** `content/phrases/schema.ts` (new), `content/phrases/catalog.json`
  (new), `content/phrases/packs/everyday-verbs.json` (new, ~40 entries),
  `lib/phrases/load.ts` (new), `lib/phrases/validate.ts` (new),
  `tests/unit/phrases-content.test.ts` (new).
- **Does:** mirrors `content/stories/schema.ts` — structure in zod, cross-field
  checks in the validator. Each entry: `phrase`, `senseNote`, `glossRu`,
  `example` (a sentence containing the phrase verbatim), `rank`. The validator
  asserts the example actually contains the phrase — the cloze in step 4 breaks
  silently otherwise — and that no two entries share a `normalizeKey`.
- **Verify:** `npm test` — a deliberately broken fixture fails validation with
  a message naming the entry.

### 3. Add a pack from the catalog screen — M · `[ ]`

- **Files:** `app/(app)/dictionary/catalog/page.tsx` (replaces the
  `ComingSoon` stub), `app/api/phrases/[pack]/route.ts` (new),
  `components/phrases/pack-card.tsx` (new), i18n,
  `tests/unit/phrases-add-route.test.ts` (new).
- **Does:** the card shows the pack, its size, and how many of its entries are
  already in your dictionary (a `UserWord` count over the pack's keys — the
  same "yours" idea `lib/stories/select.ts` uses). "Add" writes through
  `addWords` with the pack source and the example into `UserWord.example`,
  which already exists on the model and is already displayed.
- **Verify:** unit test for idempotence and for a second add not resetting a
  schedule; browser — add the pack, find the phrases in My words with their
  examples, run a `word-to-translation` session and confirm the distractors are
  other phrases, not single words.

At this point the feature is **already usable and already shippable.** Steps 4
and 5 are improvement, not completion.

### 4. The cloze format — M · `[ ]`

- **Files:** `lib/practice/question.ts` (`"cloze"` in `EXERCISE_KINDS` and the
  builder branch), `lib/practice/distractors.ts` (same-pack preference),
  `lib/practice/catalog.ts` (the training entry),
  `components/practice/question-view.tsx`,
  `tests/unit/practice-question.test.ts`.
- **Does:** takes `UserWord.example`, blanks the phrase, offers four phrases.
  Words without an example are **not eligible** — the format's queue is a
  filtered one, and the source picker must say so rather than serve a broken
  question.
- **Verify:** `npm test` — blanking is exact and case-preserving, an entry
  without a usable example is excluded, distractors are all phrases. Browser:
  run the format.

### 5. Decide on a section, with the screens built — S · `[ ]`

- **Files:** possibly `lib/nav.ts`, `tests/unit/nav.test.ts`, i18n. Possibly
  nothing.
- **Does:** with two or three packs on the catalog screen, judge whether
  Phrases is a shelf a person browses (a section) or a source you add from
  once (a catalog page). **Not deciding this in advance is deliberate** — the
  sidebar has six entries and each new one costs the others.
- **Verify:** if a section is added, the nav test covers it.

Steps 1→2→3 sequential. 4 depends on 2 (the example field) but not on 3.
Step 6 lives in §8 and must land **before** 3: the first pack must not be the
thing that makes the word count wrong.

## 7. Risks

| Risk | Noticed by | Cheapest resolution |
|---|---|---|
| A borrowed sentence gets adapted phrase-by-phrase instead of rewritten | Reading the pack against §2.1's rule | Sixty entries is small enough to check honestly; the rule is stated where the writing happens |
| A phrase gets glossed to the wrong sense | Review of the pack, by a human, entry by entry | 40 entries is small enough to read in full. This is content review, not a code problem, and it is the actual work |
| The dominant sense is chosen by intuition rather than data | Review | PHaVE's per-sense percentages are the evidence; a sense chosen against them gets a note in the pack file saying why |
| Cloze breaks when the example does not contain the phrase verbatim | Step 2's validator | Caught at build/test time, never at review time |
| `example` is already used for something else on `UserWord` | grep before step 3 | It is a free-text field a user can also fill; the pack must not overwrite an existing non-empty value on re-add |
| The catalog stub is replaced by something worse than "Coming soon" | Browser check | It ships with at least one real pack or it does not ship |

**Rollback:** delete the pack file and the route; `UserWord` rows already
added are ordinary words and keep working, which is the strongest argument for
approach A in §4. No migration to unwind.

## 8. Progress

A phrase is a `UserWord`, so it inherits the calendar, the streak, minutes,
retention and the memory curve for free — the same argument that made §4's
approach A the right one. Nothing here can break the streak.

**But it quietly corrupts one number, and that number is the one people look
at.** `lib/overview.ts` counts `UserWord` rows and calls the result words. Add
a forty-phrase pack and the dictionary bar reports forty new *words*, which is
false: *give up* is one meaning, not a word, and a learner comparing "620
words" to a vocabulary-size intuition is now comparing against something that
no longer means what it says.

`lib/lexicon/dataset.ts:kindOf` already distinguishes the two, and
`Lexeme.kind` already stores it, so the fix is an aggregate, not a migration —
it is [progress-activity.md](shipped/progress-activity.md) step 5, and this section
**must not ship before it**. That is the only ordering constraint between the
two plans.

Worth adding once packs exist, and cheap because the data is already there:
how many of a pack's entries are learned, on the pack card itself — the same
"yours" count `lib/stories/select.ts` computes for a story.

### 6. Split words from phrases before the first pack ships — S · `[x]`

- **Files:** see [progress-activity.md](shipped/progress-activity.md) step 5 —
  `lib/overview.ts`, `components/overview-stats.tsx`, i18n,
  `tests/unit/overview.test.ts`.
- **Does:** the dictionary bar reports words and phrases separately.
- **Verify:** unit test over a fixture containing both; then add a pack and
  confirm the word count does not jump.

## 9. Deferred, captured on purpose

- **Multiple senses per phrase** — approach C in §4, a `sense` column and a
  compound unique key. Revisit at B1 content.
- **Collocations beyond phrasal verbs** (*make a decision*, *heavy rain*) as a
  second pack. Same machinery, different list, and a different sourcing
  question.
- **Phrases from the [Reader](shipped/reader.md)** — a multi-word annotation tapped in
  a text is already a phrase, and `role: "phrase"` exists in the story schema
  for exactly this. The two features join up naturally once both exist.
- **Recorded audio for phrases** in bulk. `lexicon:audio` could do it; it costs
  money and should wait until the packs have proven themselves.
