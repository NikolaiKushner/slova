# Plan — the Comparatives course

Status: proposed, not started. Branch: `feat/comparatives`.

## 1. Why this one

Everything shipped and everything planned is a verb tense: `present-simple`,
`to-be-present`, `irregular-verbs`, plus [Past Simple](past-simple.md) and
[Present Continuous](present-continuous.md) on paper. Five courses about the
verb and nothing else. This is the first course about an adjective, and the
shelf needs to stop being one shape.

It is also the only good A2 candidate with **no prerequisites**.
`past-continuous` wants Past Simple *and* Present Continuous live;
`present-perfect` wants Past Simple. Both hang off plans that are not started.
This course touches no tense, so it can be written and merged in any order
relative to the other two — see §10, which is the practical reason it is worth
starting first.

The mistakes are sharp and mechanical. Two are named everywhere the topic is
taught: the **double comparative** (*more better*, *more easier*) and the
**missing `the`** before a superlative
([EF](https://www.ef.edu/english-resources/english-grammar/comparative-and-superlative/),
[Test-English](https://test-english.com/grammar-points/a2/comparative-superlative-adjectives-adverbs/)).

A note on why the double comparative is worth four bank items rather than two.
Russian builds the comparative two ways — «красивее» and «более красивый» —
and the compound one maps onto *more + adjective* so cleanly that the simple
one stops feeling like a separate strategy
([Russian Enthusiast](https://russianenthusiast.com/russian-grammar/comparatives-and-superlatives/)).
*Более лучший* is a mistake in Russian too, and it is the same mistake.
That is reasoning from how the two systems line up, not a finding: the search
turned up no L1-transfer study that isolates this error for Russian speakers.
Treat it as the hypothesis behind an editorial choice, not as a fact the
course asserts.

## 2. Scope

**Superlatives are in, and that is a scope decision, not an oversight.** The
Coming entry in `catalog.json` reads `"titleRu": "Степени сравнения"`, and in
Russian that phrase covers both степени — сравнительная and превосходная.
Shipping only the comparative under that title would be a promise the course
breaks on its first screen. Either the course teaches both, or the title has to
change; it teaches both.

**In:** `-er` on short adjectives, `more` on long ones, the `-er` spelling
rules, `good / bad` as irregulars, `than`, `-est` and `the most`, the
obligatory `the`, and `(not) as … as`.

**Out — write no exercise that needs them:**

- **any two-syllable adjective that takes both forms.** `common`, `cruel`,
  `gentle`, `handsome`, `likely`, `narrow`, `pleasant`, `polite`, `simple`,
  `stupid`, `quiet`, `clever` are all correct either way
  ([Onestopenglish](https://www.onestopenglish.com/ask-the-experts/grammar-two-syllable-comparatives/146356.article),
  [Mango](https://mangolanguages.com/resources/learn/grammar/english/how-to-use-comparative-adjectives-in-english/study-resource-two-syllable-adjectives-that-can-take-er-est-comparatives-and-superlatives)).
  One of them in a `gap` gives the player two right answers and one of them
  gets marked wrong. This is the single largest correctness risk in the course
  and §6 answers it with a closed list;
- **`far`.** `farther` and `further` are both right, and the split is the same
  kind of noise `past-simple.md` refused for `travelled / traveled`. The
  adjective appears once, in a `pitfall` block, and in no exercise;
- **comparative adverbs** (*more quickly*, *faster*, *he drives worse*). A
  different part of speech and a different rule set;
- **`the more … the better`**, `much bigger` / `far bigger` modifiers,
  `by far the best`, and `less / least`. B1;
- **articles.** `sup-the` teaches one mechanical fact — a superlative is
  preceded by `the`. It is not the article course and must not drift into one:
  no exercise in this course ever asks a learner to choose between `a` and
  `the`.

**Not a code change.** Player, outline, progress, Grammar Review and audio all
work by slug. This ships content plus one registration block. No migration, no
route, no component.

## 3. Shape on disk

```
content/courses/comparatives/
  course.json    01-er.json      02-more.json      03-spelling.json
  rules.json     04-superlative.json  05-irregular.json  06-as-as.json
  bank.json      99-test.json
```

`course.json`:

```json
{
  "slug": "comparatives",
  "title": "Comparatives",
  "titleRu": "Степени сравнения",
  "level": "A2",
  "estMinutes": 40,
  "lessons": ["er", "more", "spelling", "superlative", "irregular", "as-as", "test"],
  "outcomes": [
    "Выбирать между **-er** и **more** по длине слова: **older**, но **more expensive**",
    "Никогда не ставить оба сразу: **better**, не more better",
    "Писать **bigger**, **happier**, **nicer** без ошибок",
    "Ставить **the** перед превосходной: **the biggest**, не just biggest",
    "Сравнивать поровну: **as tall as**, и **not as tall as** — значит ниже"
  ]
}
```

`titleRu` is copied verbatim from the Coming entry so the row does not change
wording the day it goes live.

`course.json` has no `order` field. It used to, it was read by nothing, and
three plans held 4/5/6 by authorial care alone with no check behind them; it
was dropped from `courseSchema` before this course was written. The Grammar
list follows the order of `catalog.json` and always did.

## 4. Rules — `rules.json`

Twelve. Every `ruleId` in every exercise must be one of these, and a miss
schedules that rule into Grammar Review, so `anchorMd` is what the person reads
right after getting it wrong: Russian, one or two lines, the wrong form named.

| id | title | what the anchor says |
|---|---|---|
| `cmp-er-short` | old → older | короткое прилагательное берёт **-er**: old → older, cheap → cheaper, fast → faster |
| `cmp-more-long` | more expensive | длинное берёт **more** перед собой, а не окончание: more expensive, more beautiful. Не expensiver |
| `cmp-no-double` | либо **-er**, либо **more** | два способа сразу — ошибка: **better**, не more better; **easier**, не more easier. Как «более лучший» по-русски |
| `cmp-than` | than, не then | второе, с чем сравниваем, вводится через **than**: She is taller **than** me. **then** — это «потом», другое слово |
| `cmp-spell-double` | big → bigger | односложное «гласная + одна согласная» удваивает её: big, hot, thin, sad. **w** и **y** не удваиваются: new → newer, slow → slower |
| `cmp-spell-y` | happy → happier | **-y** превращается в **-ier**: happy → happier, easy → easier, busy → busier. Двусложные на **-y** берут окончание, а не more |
| `cmp-spell-e` | nice → nicer | прилагательное на **-e** берёт только **-r**: nice → nicer, large → larger. Не niceer |
| `cmp-irregular` | good → better, bad → worse | у этих двух своя форма. Не gooder, не more good, не badder |
| `sup-est-short` | the oldest | превосходная у короткого — **-est**, орфография та же: the biggest, the happiest, the nicest |
| `sup-most-long` | the most expensive | у длинного — **the most** перед словом. Не the expensivest и не the most expensivest |
| `sup-the` | перед превосходной — **the** | превосходная почти всегда с **the**: He is **the** best. «He is best» — незаконченная фраза |
| `cmp-as-as` | as tall as | равенство: **as** + прилагательное + **as**. Отрицание **not as tall as** значит «ниже», а не «выше» |

`cmp-no-double` and `sup-the` are the two the course exists to prevent. Give
each **four** bank items, not two.

## 5. Lessons

Every lesson: a `ruleCard` at the top, then theory in the house order —
`explanation` → `heading` → `rules` → `table` → `example` → `pitfall` →
`heading` "Коротко" → `recap` — then exercises. Copy the block rhythm from
`present-simple/03-spelling.json`; do not invent a new one.

| file | slug | titleRu | rules | est |
|---|---|---|---|---|
| `01-er.json` | `er` | Короткие: -er | `cmp-er-short`, `cmp-than` | 5 |
| `02-more.json` | `more` | Длинные: more | `cmp-more-long`, `cmp-no-double` | 5 |
| `03-spelling.json` | `spelling` | Орфография | `cmp-spell-double`, `cmp-spell-y`, `cmp-spell-e` | 5 |
| `04-superlative.json` | `superlative` | Превосходная | `sup-est-short`, `sup-most-long`, `sup-the` | 6 |
| `05-irregular.json` | `irregular` | good и bad | `cmp-irregular` | 4 |
| `06-as-as.json` | `as-as` | as … as | `cmp-as-as` | 4 |
| `99-test.json` | `test` | Проверка всего курса | all twelve | 6 |

`irregular` sits **after** `superlative`, which is the one ordering choice in
this course worth defending. `good` and `bad` are irregular in both degrees at
once — better / the best, worse / the worst. Teach them before the superlative
exists and the lesson can only cover half of each pair, and the other half has
to come back later as an aside. Teach them after and one lesson of sixteen
items covers four forms that learners confuse with each other, which is what
makes it a lesson rather than a footnote.

`cmp-than` sits in lesson 1 because no comparative sentence can be written
without it.

## 6. The adjective list

**Closed. Nothing outside it appears anywhere in the course**, including in
theory blocks. This is what keeps §2's ambiguity risk from reaching the player.

- **one syllable:** old, new, cheap, small, tall, short, cold, warm, fast,
  long, strong, young, clean, dark
- **doubling:** big, hot, thin, sad, wet, fat
- **silent -e:** nice, large, safe, close, late
- **two syllables in -y:** happy, easy, busy, early, funny, heavy, dirty, angry
- **long:** expensive, beautiful, important, difficult, interesting,
  comfortable, dangerous, popular, useful, careful, modern, famous
- **irregular:** good, bad

Adding an adjective to this list during writing is allowed, but it goes in the
list first and it gets checked against §2's banned set before it goes in a
sentence.

## 7. Exercises

Counts are enforced by `lib/courses/load.ts`, not by taste: **16 per lesson**
(the player deals 10), **12 in the test**, **≥2 bank items per rule used in a
lesson**. Present Simple sits exactly on those numbers.

- 6 lessons × 16 = 96
- test = 12
- bank = 28 (2 each, 4 for `cmp-no-double` and `sup-the`)
- **136 exercises, ~2 100 lines of JSON.** That is the cost of this course, and
  it is nearly all of the work.

Kind mix per lesson, following the existing files: roughly `choice` 6, `gap` 5,
`pick-sentence` 3, `transform` 2. Two lessons bend it:

- `03-spelling` leans on `gap` (7–8). Spelling is only tested by writing it.
- `06-as-as` leans on `transform` (5), rewriting a comparative sentence as an
  `as … as` one and back. That is the whole skill.

Schema details that are easy to get wrong:

- **`the` is either in the stem or in the blank, never ambiguous.** For items
  about form (`sup-est-short`, `sup-most-long`) print `the` in the sentence and
  let the blank take `biggest`. For items about `sup-the`, leave the blank
  wide enough to hold `the biggest`, and do **not** put bare `biggest` in
  `accept` — accepting it silently teaches the error the rule exists to stop.
- `pick-sentence` takes **exactly two** options — the right form against the
  plausible wrong one, never three. In lesson 2 the wrong option is the double
  comparative.
- when the trailing `(word)` cannot be the cue — writing the adjective would
  give a spelling answer away — use the `cue` field. A cue is never a form of
  the answer.
- `accept` carries `than me` / `than I am`, and `isn't as tall as` /
  `is not as tall as`. A missing twin marks a correct answer wrong *and*
  schedules the rule for review, so the learner is punished twice for the
  app's bug.
- ids: `cmp-er-01`, `cmp-more-01`, `cmp-spell-01`, `cmp-sup-01`, `cmp-irr-01`,
  `cmp-as-01`, `cmp-test-01`, `cmp-bank-01`. Bank ids must not repeat a lesson
  id — the loader rejects it, and reusing one would let Grammar Review re-ask a
  prompt the person just answered.

## 8. Wiring and audio

`lib/courses/load.ts` — nine imports and one `PACKS` entry, matching the
existing blocks exactly:

```ts
comparatives: {
  course: comparativesCourse,
  rules: comparativesRules,
  lessons: { er, more, spelling, superlative, irregular, "as-as": asAs, test },
  bank: comparativesBank,
},
```

`content/courses/catalog.json` — replace the Coming entry in the **A2** group
with `{ "slug": "comparatives", "status": "available" }`, positioned after
`irregular-verbs`, since the Grammar list follows file order.

`content/courses/SOURCE.md` — the closing paragraph says A2 and B1 "are the
next shelves, not this course's JSON yet". That sentence stops being true here;
rewrite it rather than appending to it.

Audio: `npm run courses:audio` records `example.en` and every `transform`
source. Roughly 400 characters, about **$0.006** at $15 per million. Cost is
not the reason to be careful; an immutable upload is. Dry-run first, read the
sample lines, fix awkward sentences in the JSON *before* recording, then commit
`content/courses/audio-manifest.json` with the content.

## 9. Slices, in the order they should land

Each is a commit on `feat/comparatives`, each verified before the next.

1. **Skeleton, invisible.** `course.json`, `rules.json`, all seven lesson files
   with theory and *one* exercise each, a stub bank; register in `load.ts`;
   leave `catalog.json` on Coming. Add a `comparatives pack` block to
   `tests/unit/courses-schema.test.ts` asserting slugs, lesson order and the
   twelve rule ids. `loadCourse("comparatives")` will throw on the counts —
   that is the point: the failing invariant is the to-do list.
   *Verify:* `npm test` — the new pack test fails only on exercise counts.
2. **The adjective list as a test.** Before writing any content, add a unit
   test that walks every exercise prompt and answer in the pack and fails on
   any adjective from §2's banned set. Twelve words in a regex, and it is the
   only mechanical defence against the course's main correctness risk.
   *Verify:* it passes trivially on the skeleton, and keeps passing after each
   slice below.
3. **Lessons 1–3** to full 16 each, plus their bank items.
4. **Lessons 4–6** to full 16 each, plus their bank items.
5. **Test lesson** to 12, bank to 28. Now `loadCourse` passes.
   *Verify:* `npm test`, `npm run typecheck`.
6. **Audio**, per §8.
7. **Go live.** Flip `catalog.json`; update the available-slug array in
   `tests/unit/courses-catalog.test.ts`; rewrite the closing paragraph of
   `SOURCE.md`.
   *Verify:* `npm test`, `npm run lint`, `npm run build`. Then `npm run dev`
   and walk the course in the browser: outline, one lesson end to end, a
   deliberate miss, a superlative answered both with and without `the`, the
   test, and Grammar Review the next day — set the timezone cookie forward
   rather than waiting.
8. **Review, then merge.** Present the diff; merge to `main` only on the
   maintainer's word. `main` is a release.

## 10. Risks

- **The two-form adjective is the bug that ships.** *He is more polite than
  Tom* and *He is politer than Tom* are both English. Nothing in the schema
  catches it, the unit tests do not read English, and the learner sees a
  correct answer marked wrong. Slice 2 exists for this and should be written
  before any content, not after.
- **`sup-the` and `accept` pull in opposite directions.** Everywhere else in
  the repo a generous `accept` list is the safe default. Here, accepting the
  answer without `the` disables the rule. Decide per item which of the two
  things the blank is testing, and write the stem so the answer is forced.
- **The content is the project.** 136 exercises written in one sitting go stale
  in quality around item 60. The slices exist so each lesson is written, read,
  and committed on its own.
- **Rule granularity is a one-way door.** `GrammarRuleMemory` rows key on
  `ruleId`. Merging `sup-est-short` and `cmp-er-short` after release, or
  splitting `cmp-spell-double`, orphans whatever was already scheduled. Decide
  the twelve now.
- **Merge order with the other two plans.** All three touch `load.ts`,
  `catalog.json`, `SOURCE.md`, `audio-manifest.json` and both course tests; two
  in flight at once means four guaranteed conflicts and a manifest merge that
  can lose a paid upload. Ship one, merge it, start the next. This one is the
  cheapest to sequence anywhere because it shares no rule ids and no
  vocabulary with either tense course.
- **Watch the catalog threshold.** `CATALOG_CHROME_MIN_COURSES = 6` turns on
  search, sort and CEFR shelves. Live courses today: three. This one plus the
  two pending plans makes six — the Grammar page will change shape on the merge
  that lands last, whichever it is. Worth looking at the page then, before the
  release rather than after.
