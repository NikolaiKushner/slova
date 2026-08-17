# Plan: expanding the word base, the audio, and what a learner can start from

**Date:** 2026-08-17 · **Branch:** `lexicon-expansion` · **Status:** in progress
**Source:** owner's question — how do we grow the word base and the audio, and
what do we do about collocations and irregular verbs

## Problem

The shared base holds 8,214 lexemes and answers 92.6% of what gets asked of it.
That number is not the problem. The problem is everything around it that was
built and never filled: no slow recordings, no transcriptions, no part of
speech, no course audio, twenty-six collocations, and no irregular verbs
anywhere in the product. Three pipelines that cost under two dollars to run
have never been run, and the columns they would fill are already rendered by
the UI. A person arriving today finds two grammar courses, three sets, and a
dictionary that can only ask them single words.

So this is not a scaling plan. It is a plan about what a learner can actually
start from.

## Outcome

Every lexeme has a normal and a slow recording, a transcription, and a part of
speech. Course examples have sound. Irregular verbs exist twice over — as a
grammar course that explains the patterns and as a training format that drills
the triples on the FSRS schedule. A collocation can be studied without the
builder handing out one tile per space.

## Success criteria

- [x] `Lexeme` rows with `audioSlowUrl` ≈ rows with `audioUrl` (was 0 vs 8,177,
      now **8,210** vs 8,177 — see the asymmetry note in step 1)
- [x] `Lexeme.transcription` and `Lexeme.partOfSpeech` populated for every
      `source="seed"` row (today: **7,866** IPA and **8,027** POS on 8,235 seed
      rows; blanks are declines, not misses)
- [x] `content/courses/audio-manifest.json` has an entry per course example
      (was `"entries": {}`, now 51 texts × normal + slow)
- [x] `content/lexicon/en-ru-frequency.jsonl` covers the input list, or the
      remainder is written down as refused-on-purpose
      (8,246 translated; **1,576** refused — proper nouns, brands, abbreviations;
      see `content/lexicon/SOURCE.md`)
- [x] `irregular-verbs` is an available course in `content/courses/catalog.json`
- [x] `verb-forms` is in `EXERCISE_KINDS`, deals a question from a triple, and
      is scheduled by the same FSRS path as every other format
      (own mode on `/practice`, 95 lexemes with `forms`)
- [ ] A collocation survives `builder`, `judge` and `distractors` without
      giving itself away
- [x] `npm test` green after every step

## Non-goals

- Not merging to `main` (ask first, per `CLAUDE.md`)
- Not replacing the frequency list or its licence story — see Deferred
- Not changing the TTS voice or model — `AUDIO_PROFILE_VERSION` exists for
  that day, this is not that day
- Not a lemma fallback in `lookupBatch` — measured and rejected, see Design
- Not ready-made sets, the learning map, reading practice, or topic courses
- Not touching `UserWord.front`/`back` semantics for anything except the new
  verb triple

## Context found in the codebase

**The base, measured 2026-08-17 against production.**

| | |
|---|---|
| Lexemes | 8,214 — 8,188 `word`, 26 `phrase` |
| Source | 8,172 `seed`, 42 `llm` |
| `audioUrl` set | 8,177 (37 missing, 25 of them the phrases) |
| `audioSlowUrl` set | 0 |
| `transcription` / `partOfSpeech` | 0 / 0 |
| `LlmUsage` totals | 524 `lexiconHits`, 42 `llmMisses` — **92.6% hit rate** |
| `TtsUsage` | empty — the on-demand path has never been taken |
| `UserWord` | 217 rows across 5 users; 216 hit the lexicon |
| Courses | 2 available, 22 `coming` |

**Built and unfilled.** `SLOW_AUDIO_PROFILE` is defined in
`lib/audio/profile.ts`, `scripts/build-audio.ts` takes `--slow` and even
`--dry-run`, `Lexeme.audioSlowUrl` exists, and `lib/practice/question.ts`
passes it into every question shape it builds. Zero rows. The same is true of
`transcription`, which `question.ts` documents as "IPA, revealed with the
answer — never before it". `scripts/build-course-audio.ts` exists and
`content/courses/audio-manifest.json` is `{"version":1,"source":…,"entries":{}}`.

**The input list has a tail.** `content/lexicon/en-frequency.txt` holds 9,822
words; 8,183 came back translated. The 1,649 that did not are mostly what a
web-crawled frequency list is full of — proper nouns and abbreviations. The
`--missing` flag on `scripts/build-lexicon.ts` was written for exactly this
second pass.

**What breaks on a collocation.** `scramble()` in `question.ts` splits the
answer by character and its own comment concedes the half-measure: "Spaces are
kept as their own tile so a phrase can still be assembled." `judge()` in
`lib/practice/answer.ts` strips one leading article — `/^(a|an|the|to)\s+/` —
so `make decision` fails against `make a decision`. `choiceOn()` draws
distractors from the whole pool, so a phrase among single words is given away
by its length before it is read. And `audioObjectKey()` guards `..`, `\0` and
`\\` but not spaces: the one phrase that has a recording lives at
`…/audio/en/to bend over backwards.mp3`.

**Seed is trusted.** `TRUSTED` in `lib/lexicon/write.ts` is
`{curated, seed}`, and a trusted row goes `isGlobal` with no confirmations.
Anything this plan seeds is everybody's answer on the first write, which is the
reason collocations are curated below rather than generated.

**A course is content plus one import.** `lib/courses/load.ts` keys `PACKS` by
slug and imports the JSON statically so it travels with the serverless bundle.
Adding a course is: the JSON files, an entry in `PACKS`, an entry in
`catalog.json`. The loader then enforces ≥16 exercises per lesson,
≥12 in the test, and ≥2 bank exercises for every rule a lesson drills.

## Design

**Chosen: fill what exists, enrich what the UI already renders, then add the
two units the product cannot express — verb triples and collocations.**

The ordering is not by ambition, it is by what unblocks what. Slow audio and
transcription are commands, not decisions. Part of speech is the prerequisite
for distractors that do not give themselves away, which is in turn what makes
collocations playable. Irregular verbs sit in the middle because they are the
biggest product gain that needs no new data source at all.

**Irregular verbs go in twice, deliberately.** A course is finite and passed
once — `UserLesson.bestScore`, `completedAt` — while a hundred and fifty verbs
need spacing forever, and the course engine has no scheduler. FSRS lives on
`UserWord`. So the patterns become a grammar course on the existing engine
(zero new code, content only), and the triples become a training format on the
existing scheduler. That split is the one the README already claims: courses
explain, trainings schedule.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| A (chosen) | Run pipelines → enrich → verbs as course + format → collocations | Two commits before anything is visible on a screen | **take** |
| B | Irregular verbs as plain `UserWord` rows, `front: "go — went — gone"` | Ships in a day; `judge()` then grades a three-part string, and no format can ask for one form | rejected: the unit is a triple, not a string |
| C | Irregular verbs as a course only | No new schema at all | rejected: a course is passed once; 150 verbs need a schedule |
| D | Lemma fallback in `lookupBatch` to raise the hit rate | No new rows, pure function | rejected on measurement — below |

**The lemma fallback, measured and dropped.** The idea was that `ran` should
find `run` instead of paying for a model. Two measurements killed it. The hit
rate is already 92.6%, and the 42 misses on record are domain vocabulary from a
pasted medical/AI lesson, not inflected forms. And when suffix rules are run
over the 1,649 words the base does not hold, they recover 30 — 1.8% of the gap
— of which the recognisable ones are `james → jam`, `peter → pet`,
`angeles → angel`, `united → unit`. The reason is structural, not fixable by
better rules: 2,803 of the 9,822 words in the list are *already* in the base as
their own entries, because the source is a frequency list of forms and not a
dictionary of lemmas. The gap that remains is proper nouns, which is precisely
where suffix stripping does its worst work. Recorded here so it is not proposed
again without new evidence.

**What would change this decision:** `llmMisses` climbing past `lexiconHits`
after real users arrive, with the miss list showing inflected forms rather than
domain words. The counters for that already exist in `LlmUsage`.

**Touches:** scripts (`build-lexicon`, `build-audio`, `build-course-audio`) ·
`lib/lexicon` (dataset v2) · `lib/llm/prompt.ts` (schema fields) ·
`lib/practice` (`question`, `answer`, `distractors`, `catalog`) ·
`content/courses/irregular-verbs/*` + `lib/courses/load.ts` ·
one Prisma migration (verb forms) · no new dependencies.

## Steps

### 1. Run the three pipelines that already exist — S · `[x]`

**Approved and started 2026-08-17.** Dry runs gave the real figures: slow
audio $0.86 (8,214 words, 57,248 characters), course audio $0.03 (51 texts,
102 recordings).

- **Course audio: done.** The manifest holds 51 entries, each with a normal and
  a slow URL.
- **Slow audio: done.** 8,210 recorded, 4 failed (`graduated`, `handy`,
  `identical`, `gonna`), 40 minutes.
- **Missing-word batch: done.** `msgbatch_01WwxoELzKKvo4MjcTcVaY24` ended
  2026-08-17T10:14Z, 17/17 succeeded. 63 glosses appended (already in the file);
  1,576 declined on purpose. Local poller had died; collected with `--resume`.

Neither audio run has been listened to in a browser yet.

**Two things the verification turned up, both worth acting on.**

*The slow column is now ahead of the normal one, not level with it.* 8,210 rows
have a slow recording and 8,177 have a normal one, because the slow run covered
lexemes the earlier normal run had failed on. It bites hardest on phrases: 26
of the 26 have slow audio and exactly **1** has normal audio, so pressing the
slow control on a collocation plays a file while pressing normal falls through
to the browser voice. Backwards, and worth one cheap `npm run lexicon:audio`
(no `--slow`, ~37 words, well under a cent) — but see the next point for why
that run should wait for step 5.

*The spaces in a phrase's object key are survivable, not broken — measured.*
`…/audio/en/slow/data privacy.mp3` is stored with a raw space. `curl` refuses
it outright (exit before request), but WHATWG URL parsing percent-encodes the
space, and both `fetch()` and an `<audio src>` go through that path — a HEAD
against the encoded form returns `200 audio/mpeg`, 18KB. So it plays today and
fails for anything that does not normalise: a CDN rule, a strict client, a
shell script. Step 5 still fixes `audioObjectKey`, and filling the 37 missing
normal recordings should happen **after** that fix rather than minting 26 more
space-bearing keys first.


- **Why first:** it is the only step with no decisions in it, and it fills
  columns the UI already reads. Everything after it is code.
- **Files:** none. Three commands against production:
  `npm run lexicon:audio -- --slow --dry-run` to get the real figure, then
  without `--dry-run`; `npm run lexicon:build -- --missing` (Batch API, up to
  an hour) followed by `npm run db:seed-lexicon`; `npm run courses:audio`.
- **Does:** slow recordings for ~8,200 words; course examples get sound;
  the input list's tail is either translated or written off.
- **Verify:** `audioSlowUrl` count matches `audioUrl` count;
  `audio-manifest.json` is no longer empty and still parses under
  `courseAudioManifestSchema` (`npm test` covers that); open a training with
  audio and press the slow control; open a course lesson and play an example.
- **Cost:** the dry run prints it. Estimated under $1 for slow audio at
  `tts-1` prices, plus a batch run for the missing words.
- **Depends on:** —
- **Note:** spends money and writes to the production base and R2. Confirm the
  dry-run figure with the owner before the paid call.

### 2. Transcription and part of speech — dataset v2 — M · `[x]`

**Code done; file filled.** `msgbatch_01VqAMk5tPPvtc8XvmpE7mBE` ended in three
minutes, 165/165 succeeded: **8,011** transcriptions and **8,033** parts of
speech on 8,246 lines. The 200-odd blanks are abbreviations and web-corpus
junk the model declined (`guestbook`, `oct`, `hz`). Seed with
`npm run db:seed-lexicon` (same run as the verb forms).

`TOKENS_PER_ROW` went 80 → 160 and the enrichment pass asks 50 words a request
rather than 100, because at 100 the three-field answer reaches the 8000-token
ceiling and a truncated response loses whole rows. Part of speech is a closed
`enum`, not free text. Two decisions worth keeping in view: an empty field is a
decline and is left off the entry rather than stored blank, and a transcription
is checked by alphabet rather than length — `roughly wah-ter` is shorter than a
real transcribed phrase, so only "reaches outside plain ASCII" separates IPA
from a respelling.


- **Why now:** `partOfSpeech` is what step 5 needs to stop a collocation from
  being given away by its neighbours, and `transcription` lights up a branch of
  `question.ts` that has never had data.
- **Files:** `lib/llm/prompt.ts` (add `transcription` and `partOfSpeech` to
  `TRANSLATION_SCHEMA`, both allowed to be empty; raise `TOKENS_PER_ROW` —
  the current 80 was sized for a translation alone);
  `lib/lexicon/dataset.ts` (`DatasetEntry` gains two optional fields; a missing
  or empty one is dropped, never stored blank, same rule as the translation);
  `scripts/seed-lexicon.ts` (write them onto the lexeme, leave `llm` and
  `import` rows alone); `scripts/build-lexicon.ts` (a v2 output file);
  `tests/unit/seed-lexicon.test.ts`, `tests/unit/llm-prompt.test.ts`.
- **Does:** IPA under the answer; a part of speech the rest of the app can
  filter and group by.
- **Verify:** `npm test`; parse the new JSONL with the old parser and confirm
  it still reads (the fields are additive); after seeding, a training shows a
  transcription when the answer is revealed and nothing before it.
- **Depends on:** 1 (so the batch spend happens once, not twice)

### 3. Irregular verbs — the course — M · `[x]`

**Done, except the browser look.** 95 verbs in
`content/lexicon/en-irregular-verbs.jsonl` (moved here from step 4 — the table
is the factual core of both), five lessons by pattern family, a 12-question
test and a 24-item bank. `npm test` green at 406, `tsc --noEmit` clean. The
screen itself has **not** been looked at: the Chrome extension is not
connected, and `/courses/**` is behind auth that I must not sign into.


- **Why before the format:** it is content on an engine that already works, and
  writing the lessons is what settles the pattern families the format will
  group by.
- **Files:** `content/courses/irregular-verbs/{course,rules,bank}.json` plus
  lessons by pattern family — no change (`cut / cut / cut`), vowel change
  (`sing / sang / sung`), `-ought`/`-aught` (`buy / bought`), `-en` participles
  (`take / took / taken`), and the ones that have to be memorised alone (`be`,
  `go`, `do`). `01-…` through `99-test.json`; register the pack in
  `lib/courses/load.ts`; flip the entry in `content/courses/catalog.json`.
  Level A2.
- **Does:** a person can learn why `sang` is not `singed` before being drilled
  on it.
- **Verify:** `npm test` — the loader enforces ≥16 exercises per lesson, ≥12 in
  the test, ≥2 bank exercises per drilled rule, unique ids, and answers present
  in their options. Open the course, finish a lesson, take the test.
- **Depends on:** —

### 4. Irregular verbs — the `verb-forms` training — L · `[x]`

**Done, except the browser look.** `Lexeme.forms` is `{ past, participle }` plus
optional `acceptPast` (for `be`). The format shows the infinitive and asks for
the two forms in separate fields; FSRS still rates the whole card. Audio is the
infinitive's recording only — the two typed forms are not spoken. Seeded: 95
rows. `npm test` 438 green.

- **Why after the course:** the rules file names the families the question will
  group its distractors by.
- **Files:** `prisma/schema.prisma` — `Lexeme.forms Json?` holding
  `{ past, participle }`, shared like the translation and the recording, plus
  the migration (`npx prisma migrate dev`, committed);
  `lib/practice/question.ts` (`verb-forms` in `EXERCISE_KINDS`, a `Question`
  variant carrying the infinitive as prompt and two expected answers);
  `lib/practice/catalog.ts` (a training entry and slug);
  `lib/practice/answer.ts` (judge two fields, keep the one-edit tolerance);
  `lib/practice/source.ts` (a source that selects only words with `forms`);
  `content/lexicon/en-irregular-verbs.jsonl` + a seeder path;
  `components/practice/*` for the two-field question; `messages/*.json`.
- **Does:** the triples ride the FSRS schedule that already exists, in a format
  that asks for one form at a time.
- **Verify:** `npm test` with new cases in `practice-question.test.ts` and
  `practice-answer`; run a session in the browser; confirm a rating writes a
  `ReviewLog` and moves `dueAt` like any other format.
- **Depends on:** 3
- **Watch:** `audioAvailable()` decides a session by `audioUrl` alone. A verb
  triple has three texts to pronounce and one column. Either record only the
  infinitive for now or say plainly in the step that the other two use the
  browser voice.

### 5. Collocations — engine first, content second — L · `[ ]`

- **Why last:** it is the only step that changes how an existing format grades
  an existing answer, and it wants the part of speech from step 2.
- **Files:** `lib/practice/question.ts` (`scramble()` splits a phrase into word
  tiles, a word into letter tiles); `lib/practice/answer.ts` (fold articles per
  token for a multi-word answer, not just at the front);
  `lib/practice/distractors.ts` (draw from candidates of the same shape —
  phrase with phrase, word with word); `lib/lexicon/key.ts`
  (`audioObjectKey` — decide whether spaces are encoded or replaced, and
  migrate the **27** existing files: 26 slow, 1 normal); then fill the 37
  lexemes still missing a normal recording; a curated
  `content/lexicon/en-ru-phrases.jsonl` of 300–500 phrasal verbs and
  collocations, plus `--kind=phrase` on the seeder.
- **Does:** a phrase can be studied in every format the app offers.
- **Verify:** `npm test` with phrase cases across question/answer/distractors;
  in the browser, a builder question on a phrase deals word tiles; a choice
  question on a phrase offers phrase options; the phrase plays.
- **Depends on:** 2
- **Note:** the list is curated, not generated. `seed` is in `TRUSTED`, so a
  model's plausible-but-wrong collocation would be everyone's answer on the
  first write with no confirmation needed.

*(3 can overlap with 1 and 2 — it touches no shared file.)*

## Risks

| Risk | Early signal | Cheapest way to resolve it now |
|---|---|---|
| Slow audio at `speed: 0.7` sounds slurred rather than clear | Listen to ten words after the run | It is one column; regenerate at a different speed, `AUDIO_PROFILE_VERSION` is there for it |
| Batch answer truncates once the schema carries three fields | Chunks come back as unparseable JSON | `TOKENS_PER_ROW` is already documented as sized from measurement — re-measure on a 100-word chunk before the full run |
| Transcriptions from a model are plausible and wrong | Spot-check twenty against a dictionary | If the error rate is not near zero, drop IPA and keep part of speech — they are independent fields |
| `Lexeme.forms` as `Json?` invites a second shape later | A third form (gerund? third person?) is wanted | It is nullable and additive; a wrong guess costs a migration, not data |
| Phrase changes regress single-word grading | `npm test` on `practice-answer` | The article fold must be a phrase-only branch, never applied to a one-word answer |
| A curated phrase list is wrong in Russian and instantly global | — | Seed it, then read all 500 rows once; `LEXICON_VERSION` retires a generation without deleting anything |

## Rollback

Step 1 writes only to columns that were null; setting them back to null is a
one-line update and the files in R2 are harmless. Steps 2, 3 and 5 are content
and pure functions — revert the commit. Step 4 has the only migration; it is
additive and nullable, so reverting the code leaves an unused column rather
than a broken read.

## Test plan

- Unit: `npm test` after every step. New cases in `seed-lexicon`,
  `llm-prompt`, `courses-schema` (the loader validates the new pack for free),
  `practice-question`, `practice-answer`, `practice-source`
- Manual, per `CLAUDE.md`: after step 1, a training with the slow control and a
  course lesson with an example; after step 3, the whole course and its test;
  after step 4, a full `verb-forms` session; after step 5, a builder and a
  choice question on a phrase
- Deliberately untested: the Batch API round trip (it is a script run by hand),
  R2 upload paths (covered by `audio-infra.test.ts` at the key level)

## Rollout

No flag. One commit per step on `lexicon-expansion`. The pipeline runs in
step 1 happen against production by hand, as `seed-lexicon.ts` documents —
they are not part of any build. Merge to `main` is a release and is not part of
this plan.

## Open questions

- [x] Which irregular verbs, and how many? **95**, in
      `content/lexicon/en-irregular-verbs.jsonl` — ordinary speech, not the
      full textbook table.
- [x] Does the slow recording get generated for all 8,200 words, or only for
      the ones a learner actually reaches? **Whole-base**, already run.

## Deferred / out of scope

- **Lemma fallback in `lookupBatch`** — measured and rejected above. Revisit
  only if `llmMisses` starts showing inflected forms.
- **Replacing the frequency list** with a learner-designed one (NGSL and
  friends) and settling the LDC licence note in `content/lexicon/SOURCE.md`.
  Needed before Slova takes money, not before it grows.
- **A better voice.** `tts-1`/`alloy` is tolerable on single words and thin on
  sentences. `AUDIO_PROFILE_VERSION` is the mechanism; the decision needs
  current pricing and a listen, not a plan entry.
- Ready-made sets (`/dictionary/catalog`), the learning map, reading practice,
  topic courses — all still `ComingSoon`.
- Images (`Lexeme.imageUrl` / `imageSource`, both unused).
