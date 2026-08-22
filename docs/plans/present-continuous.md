# Plan — the Present Continuous course

Status: proposed, not started. Branch: `feat/present-continuous`.

## 1. Why this one

`present-simple` and `to-be-present` are shipped and they lead nowhere
together. Present Continuous is the only A1 topic that spends both at once: it
*is* `to be` plus a verb, and its whole difficulty is knowing when it beats
Present Simple. Ship it and the two live courses stop being parallel and become
a sequence.

It also closes the mistake Russian speakers make second-most often, after
articles. Russian has one present form for «я работаю» and «я сейчас работаю»,
so the continuous is not a harder tense — it is a distinction the first language
never asks for. The failure is not `working` spelled wrong; it is Present Simple
used everywhere ([TALK](https://blog.talk.edu/learn-english/common-grammar-errors-russian-speakers/),
[italki](https://www.italki.com/en/article/204/15-common-english-mistakes-made-by-russian-speakers)).
A course that teaches the form and skips the contrast would miss the point of
the topic.

Relation to [`past-simple.md`](past-simple.md): independent, and the two must
not be written in parallel — see §10.

## 2. Scope

**In:** `be + V-ing` as three parts, the `-ing` spelling rules, actions
happening now, temporary situations, `isn't / aren't + V-ing`, `Is she …?` and
`What are you doing?`, short answers, the Present Simple contrast by time
marker, and a closed six-verb stative list.

**Out — write no exercise that needs them:**

- **future arrangements** (*I'm meeting John tomorrow*). Real, common, and A2 —
  it belongs beside `going to` and `will`, not in the lesson that introduces
  the form. Every exercise in this course is about now or about these days;
- `always + -ing` for irritation (*He's always losing his keys*) — B1;
- the full stative list. British Council files stative verbs at
  [B1–B2](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/stative-verbs);
  this course borrows six of them and says so out loud (§4);
- `have` in its action sense (*I'm having lunch*). `have` appears in this course
  meaning *own*, and the string `having` never appears at all;
- two-syllable stress doubling (`begin → beginning`, `prefer → preferring`).
  The doubling rule here is the one-syllable
  [1-1-1 test](https://www.englishclub.com/spelling/doubled-consonant-ing.php)
  and nothing else. `begin`, `prefer`, `travel`, `visit` do not appear;
- Past Continuous and any contrast with it.

**Not a code change.** Player, outline, progress, Grammar Review and audio all
work by slug. This ships content plus one registration block. No migration, no
route, no component.

## 3. Shape on disk

```
content/courses/present-continuous/
  course.json    01-forms.json   02-use.json     03-spelling.json
  rules.json     04-negatives.json  05-questions.json  06-vs-simple.json
  bank.json      99-test.json
```

`course.json`:

```json
{
  "slug": "present-continuous",
  "title": "Present Continuous",
  "titleRu": "Настоящее длительное",
  "level": "A1",
  "estMinutes": 40,
  "lessons": ["forms", "use", "spelling", "negatives", "questions", "vs-simple", "test"],
  "outcomes": [
    "Собирать все три части: **I am working**, не I working и не I am work",
    "Писать **-ing** правильно: **writing**, **sitting**, **lying**",
    "Строить отрицание и вопрос через **be**: **isn't working**, **Are you working?**",
    "Выбирать время по маркеру: **every day** → Simple, **at the moment** → Continuous",
    "Не ставить **-ing** словам вроде **know**, **want**, **like**"
  ]
}
```

`titleRu` is copied verbatim from the Coming entry in `catalog.json` so the row
does not change wording the day it goes live.

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
| `pc-be-ing` | am / is / are + verb**-ing** | форма из трёх частей. Пропала любая — предложения нет: не I working, не I am work |
| `pc-be-form` | I am, he is, they are | **be** меняется по лицу: I **am**, he/she/it **is**, you/we/they **are**. Ссылка на курс «to be» |
| `pc-use-now` | Прямо сейчас | действие идёт в момент речи. Рядом **now**, **at the moment**, **right now**, **Look!**, **Listen!** |
| `pc-use-temporary` | Временно, в эти дни | не только в секунду речи: **this week**, **these days**, **today**. She's working from home this week — и на будущей неделе снова в офис |
| `pc-spell-e` | write → writing | немое **-e** на конце уходит: make → making, live → living. Не writeing |
| `pc-spell-double` | sit → sitting | односложный глагол «гласная + одна согласная» удваивает её: sit, run, swim, stop. **w, x, y** не удваиваются: fix → fixing, play → playing |
| `pc-spell-ie` | lie → lying | **-ie** превращается в **-y**: lie → lying, die → dying |
| `pc-negative-not` | not идёт к **be** | отрицание вешается на be: I'm **not** working, she **isn't** working. Не I don't working — **do** тут не появляется вообще |
| `pc-question-be` | be выходит вперёд | **Is** she working? **What are** you doing? Не Do you working, не Are you work |
| `pc-short-answer-be` | Yes, I am | краткий ответ повторяет **be**, а не глагол и не do: Yes, I am / No, she isn't |
| `pc-vs-simple` | Маркер решает | **every day, usually, always** → Present Simple. **now, at the moment, today, this week** → Present Continuous |
| `pc-stative-no-ing` | know, не am knowing | шесть слов не берут **-ing**: know, understand, like, want, need, have (= иметь). I **know** the answer |

Two notes that decide how this list is used:

`pc-be-form` duplicates what `to-be-present` already teaches, and that is
deliberate. `lib/courses/load.ts` validates `ruleId` against the course's own
`rules.json`, so a cross-course id is impossible — the choice is between a
local rule and no rule at all. A learner who starts here gets the reminder; the
anchor names the other course so the two do not read as different facts.

`pc-vs-simple` and `pc-stative-no-ing` are the rules this course exists for.
Give each **four** bank items, not two.

## 5. Lessons

Every lesson: a `ruleCard` at the top, then theory in the house order —
`explanation` → `heading` → `rules` → `table` → `example` → `pitfall` →
`heading` "Коротко" → `recap` — then exercises. Copy the block rhythm from
`present-simple/03-spelling.json`; do not invent a new one.

| file | slug | titleRu | rules | est |
|---|---|---|---|---|
| `01-forms.json` | `forms` | Три части | `pc-be-ing`, `pc-be-form` | 5 |
| `02-use.json` | `use` | Сейчас и временно | `pc-use-now`, `pc-use-temporary` | 5 |
| `03-spelling.json` | `spelling` | Орфография -ing | `pc-spell-e`, `pc-spell-double`, `pc-spell-ie` | 5 |
| `04-negatives.json` | `negatives` | Отрицание | `pc-negative-not` | 4 |
| `05-questions.json` | `questions` | Вопрос | `pc-question-be`, `pc-short-answer-be` | 5 |
| `06-vs-simple.json` | `vs-simple` | Simple или Continuous | `pc-vs-simple`, `pc-stative-no-ing` | 6 |
| `99-test.json` | `test` | Проверка всего курса | all twelve | 6 |

`use` sits before `spelling` because Present Simple ordered its lessons that
way and the shelf should read the same. The price is a hard constraint on the
first two lessons: **every verb in lessons 1 and 2 takes plain `-ing`** —
work, play, read, eat, sleep, watch, listen, learn, wait, help. No `write`, no
`sit`, no `lie` until lesson 3 has explained them. One `writeing` shown to a
learner before the spelling lesson teaches the wrong thing.

Lesson 6 is the course. It comes last because it needs every earlier form
available, and it is the only lesson allowed to use Present Simple sentences as
correct answers.

## 6. Exercises

Counts are enforced by `lib/courses/load.ts`, not by taste: **16 per lesson**
(the player deals 10), **12 in the test**, **≥2 bank items per rule used in a
lesson**. Present Simple sits exactly on those numbers.

- 6 lessons × 16 = 96
- test = 12
- bank = 28 (2 each, 4 for `pc-vs-simple` and `pc-stative-no-ing`)
- **136 exercises, ~2 100 lines of JSON.** That is the cost of this course, and
  it is nearly all of the work.

Kind mix per lesson, following the existing files: roughly `choice` 6, `gap` 5,
`pick-sentence` 3, `transform` 2. Two lessons bend it:

- `05-questions` leans on `transform` (4–5), the way `present-simple/05` does.
- `06-vs-simple` leans on `gap` (7–8) and `pick-sentence` (4). The gap is the
  only kind that makes the learner *produce* the choice instead of recognising
  it, and recognition is not the skill being taught.

Schema details that are easy to get wrong:

- **Every item in lesson 6 carries a time marker.** A sentence without one has
  two defensible answers, and the player will mark a correct answer wrong. If a
  sentence reads fine in both tenses, it is not an exercise — delete it.
- `pick-sentence` takes **exactly two** options — the right form against the
  plausible wrong one, never three. In lesson 6 the wrong option is the other
  tense, not a broken form.
- a `gap` in the negatives or questions lesson needs `task: "negative"` or
  `task: "question"`. Without it the sentence gives no sign what the blank
  wants, and the item is unanswerable.
- when the trailing `(word)` cannot be the cue — writing it would give the
  answer away — use the `cue` field. A cue is never a form of the answer.
- `accept` is where this course will bleed. Both directions of every
  contraction: `I'm` / `I am`, `he's` / `he is`, `they're` / `they are`,
  `isn't` / `is not`, `aren't` / `are not`, and `I'm not` / `I am not`. A
  missing twin marks a correct answer wrong *and* schedules the rule for
  review, so the learner is punished twice for the app's bug.
- ids: `pc-form-01`, `pc-use-01`, `pc-spell-01`, `pc-neg-01`, `pc-quest-01`,
  `pc-vs-01`, `pc-test-01`, `pc-bank-01`. Bank ids must not repeat a lesson id
  — the loader rejects it, and reusing one would let Grammar Review re-ask a
  prompt the person just answered.

## 7. Wiring

`lib/courses/load.ts` — nine imports and one `PACKS` entry, matching the
existing blocks exactly:

```ts
"present-continuous": {
  course: presentContinuousCourse,
  rules: presentContinuousRules,
  lessons: { forms, use, spelling, negatives, questions, "vs-simple": vsSimple, test },
  bank: presentContinuousBank,
},
```

`content/courses/catalog.json` — replace the Coming entry in the A1 group with
`{ "slug": "present-continuous", "status": "available" }`, positioned **after**
`to-be-present`, since the Grammar list follows file order. That is also the
order the course should be taken in.

`content/courses/SOURCE.md` — one line: Present Continuous is written; the A1
shelf still holds there is / past simple / can / have got / articles.

## 8. Audio

`npm run courses:audio` records `example.en` and every `transform` source.
Three courses currently produce 51 phrases / 1 121 characters, so this adds
roughly 400 characters — about **$0.006** at $15 per million. Cost is not the
reason to be careful; an immutable upload is.

1. `npm run courses:audio -- --dry-run` and read the sample lines. Anything
   awkward gets fixed in the JSON *before* it is recorded.
2. Then the real run. The script writes the manifest after each upload, so a
   failure halfway does not re-charge for what already landed.
3. Commit `content/courses/audio-manifest.json` with the content.

## 9. Slices, in the order they should land

Each is a commit on `feat/present-continuous`, each verified before the next.

1. **Skeleton, invisible.** `course.json`, `rules.json`, all seven lesson files
   with theory and *one* exercise each, a stub bank; register in `load.ts`;
   leave `catalog.json` on Coming. Add a `present-continuous pack` block to
   `tests/unit/courses-schema.test.ts` asserting slugs, lesson order and the
   twelve rule ids. `loadCourse("present-continuous")` will throw on the counts
   — that is the point: the failing invariant is the to-do list.
   *Verify:* `npm test` — the new pack test fails only on exercise counts.
2. **Lessons 1–3** to full 16 each, plus their bank items. Check by eye that
   lessons 1 and 2 contain no verb whose `-ing` changes its spelling.
3. **Lessons 4–5** to full 16 each, plus their bank items.
4. **Lesson 6 alone.** It is a third of the thinking in a sixth of the files.
   Read every item twice asking "is the other tense also correct here?"
5. **Test lesson** to 12, bank to 28. Now `loadCourse` passes.
   *Verify:* `npm test`, `npm run typecheck`.
6. **Audio**, per §8.
7. **Go live.** Flip `catalog.json`; update the available-slug array in
   `tests/unit/courses-catalog.test.ts`.
   *Verify:* `npm test`, `npm run lint`, `npm run build`. Then `npm run dev`
   and walk the course in the browser: outline, one lesson end to end, a
   deliberate miss, a correct answer typed as a contraction *and* as two words,
   the test, and Grammar Review the next day — set the timezone cookie forward
   rather than waiting.
8. **Review, then merge.** Present the diff; merge to `main` only on the
   maintainer's word. `main` is a release.

## 10. Risks

- **Lesson 6 is a false-negative factory.** Every other lesson has one right
  answer by construction; this one has one right answer only if the sentence
  was written carefully. The separate slice exists for that reason.
- **A wrong `accept` list reads as a bug.** This course has more contractions
  than any shipped one — `'m`, `'s`, `'re`, `isn't`, `aren't`, and `I'm not`,
  which has no `amn't` twin. Walking one lesson in the browser catches this;
  unit tests do not.
- **The content is the project.** 136 exercises written in one sitting go stale
  in quality around item 60. The slices exist so each lesson is written, read,
  and committed on its own.
- **Rule granularity is a one-way door.** `GrammarRuleMemory` rows key on
  `ruleId`. Splitting `pc-spell-double` or widening `pc-stative-no-ing` past the
  six verbs after release orphans whatever was already scheduled. Decide the
  twelve now.
- **Do not run this branch alongside `feat/past-simple`.** Both touch
  `load.ts`, `catalog.json`, `SOURCE.md`, `audio-manifest.json` and both course
  tests. Two content branches, four guaranteed conflicts, and a manifest merge
  that can lose a paid upload. Ship one, merge it, start the other.
- **Watch the catalog threshold.** `CATALOG_CHROME_MIN_COURSES = 6` turns on
  search, sort and CEFR shelves. This course makes four, or five if Past Simple
  landed first. One more after that and the Grammar page changes shape on its
  own — worth looking at then, not now.

---

One correction to [`past-simple.md`](past-simple.md) §9.6 while it is still
unstarted: shipping a course does **not** change the `coming[0]` assertion in
`tests/unit/courses-catalog.test.ts`. That assertion names `there-is`, which is
first on the Coming shelf and stays there until it is the course being written.
Only the available-slug array needs touching. The same is true here.
