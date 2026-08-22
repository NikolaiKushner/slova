# Plan — the Past Simple course

Status: proposed, not started. Branch: `feat/past-simple`.

## 1. Why this one

Six A1 topics sit on the Coming shelf. Past Simple is the only one that makes
work already shipped worth more: `irregular-verbs` teaches the second form and
then has nowhere to spend it — `didn't` and `Did …?` are not in that course.
Ship Past Simple and the two courses become one path instead of two islands.

It is also the first course that leaves the present tense, which is what the
A1 line was building toward.

## 2. Scope

**In:** regular `-ed` and its spelling, irregular second forms, `was / were`,
`didn't + base`, `Did …? + base`, short answers, the time markers that make a
sentence readable as past (`yesterday`, `last week`, `two days ago`, `in 2010`).

**Out — write no exercise that needs them:**

- Past Continuous, Present Perfect, and any contrast with either;
- `used to`;
- subject questions without `did` (*Who came?*) — a real rule, a B1 one;
- memorizing the irregular list. That is the `irregular-verbs` course. This one
  reuses about ten verbs from it and says so;
- `travel → travelled / traveled`. The BrE/AmE split has no place in a
  first past-tense course; the verb does not appear.

**Not a code change.** The course machinery is finished: player, outline,
progress, Grammar Review, audio all work by slug. This ships content plus one
registration block. No migration, no route, no component.

## 3. Shape on disk

```
content/courses/past-simple/
  course.json    01-forms.json  02-spelling.json  03-irregular.json
  rules.json     04-was-were.json  05-negatives.json  06-questions.json
  bank.json      99-test.json
```

`course.json`:

```json
{
  "slug": "past-simple",
  "title": "Past Simple",
  "titleRu": "Простое прошедшее",
  "level": "A1",
  "estMinutes": 45,
  "lessons": ["forms", "spelling", "irregular", "was-were", "negatives", "questions", "test"],
  "outcomes": [
    "Ставить **-ed** одинаково для всех лиц: **I worked**, **she worked**",
    "Писать **-ed** правильно: **lived**, **studied**, **stopped**",
    "Брать у неправильного глагола вторую форму: **went**, а не goed",
    "Строить **didn't** и **Did …?** с начальной формой глагола",
    "Не тащить **did** к **be**: **wasn't**, **Was she …?**"
  ]
}
```

`course.json` has no `order` field. It used to, it was read by nothing, and
three plans held 4/5/6 by authorial care alone with no check behind them; it
was dropped from `courseSchema` before this course was written. The Grammar
list follows the order of `catalog.json` and always did.

`titleRu` is a subtitle, not a translation: Present Simple uses
"Простое настоящее", `to be` uses "am / is / are". "Простое прошедшее" already
sits in the catalog's Coming entry — keep the same words so the row does not
change wording when it goes live.

## 4. Rules — `rules.json`

Eleven. Every `ruleId` in every exercise must be one of these; a miss schedules
the rule into Grammar Review, so an `anchorMd` is what the person reads after a
mistake, in Russian, one or two lines, with the wrong form named.

| id | title | what the anchor says |
|---|---|---|
| `pst-ed-all-persons` | worked — for everyone | `-ed` не меняется по лицу: I worked, she worked, they worked. Никакого `-s` |
| `pst-finished-past` | Finished, and in the past | законченное действие + маркер (yesterday, last week, two days ago, in 2010); не Present Simple |
| `pst-spelling-e` | live → lived | глагол на `-e` берёт только `-d` |
| `pst-spelling-y` | study → studied | согласная + y → `-ied`; после гласной y остаётся: play → played |
| `pst-spelling-double` | stop → stopped | односложный глагол «гласная + одна согласная» удваивает её: stop, plan, shop. Не visit → visitted; w, x, y не удваиваются |
| `pst-irregular-second` | went, not goed | у неправильного глагола своя вторая форма; `-ed` к ней не добавляют. Ссылка на курс Irregular verbs |
| `pst-was-were` | was / were | I, he, she, it — **was**; you, we, they — **were** |
| `pst-be-no-did` | be has its own past | wasn't / weren't, Was …? / Were …? Не didn't be, не Did you were |
| `pst-negative-didnt` | didn't + base form | **didn't** уже прошедшее, глагол возвращается в начальную форму: She didn't go, не didn't went |
| `pst-question-did` | Did … + base form | Did + человек + начальная форма: Did you go? Не Did you went? |
| `pst-short-answer` | Yes, I did | краткий ответ повторяет **did**, не глагол: Yes, I did / No, she didn't. На вопрос с **was** — Yes, I was |

`pst-be-no-did` and `pst-short-answer` are the two the Russian-speaking learner
actually loses points on. Give each of them four bank items, not two.

## 5. Lessons

Every lesson: a `ruleCard` at the top, then theory in the house order —
`explanation` → `heading` → `rules` → `table` → `example` → `pitfall` →
`heading` "Коротко" → `recap` — then exercises. Copy the block rhythm from
`present-simple/03-spelling.json`; do not invent a new one.

| file | slug | titleRu | rules | est |
|---|---|---|---|---|
| `01-forms.json` | `forms` | Правильные глаголы | `pst-ed-all-persons`, `pst-finished-past` | 5 |
| `02-spelling.json` | `spelling` | Орфография -ed | `pst-spelling-e`, `pst-spelling-y`, `pst-spelling-double` | 4 |
| `03-irregular.json` | `irregular` | Неправильные глаголы | `pst-irregular-second` | 5 |
| `04-was-were.json` | `was-were` | was / were | `pst-was-were`, `pst-be-no-did` | 5 |
| `05-negatives.json` | `negatives` | Отрицание | `pst-negative-didnt` | 4 |
| `06-questions.json` | `questions` | Вопрос | `pst-question-did`, `pst-short-answer` | 4 |
| `99-test.json` | `test` | Проверка всего курса | all eleven | 6 |

Lesson 3 draws its verbs from `irregular-verbs` and no others: go, have, see,
take, come, make, get, buy, put, write. A learner who did that course meets
nothing new; one who did not gets a link, not a list to memorize.

Lesson 4 exists because `was / were` breaks the course's own pattern — it is
the one past verb that never takes `did`. Placing it before the `didn't` and
`Did …?` lessons means those two can be about one idea each.

## 6. Exercises

Counts are enforced by `lib/courses/load.ts`, not by taste: **16 per lesson**
(the player deals 10), **12 in the test**, **≥2 bank items per rule used in a
lesson**. Present Simple sits exactly on those numbers.

- 6 lessons × 16 = 96
- test = 12
- bank = 26 (2 each, 4 for `pst-be-no-did` and `pst-short-answer`)
- **134 exercises, ~2 100 lines of JSON.** That is the cost of this course, and
  it is nearly all of the work.

Kind mix per lesson, following the existing files: roughly `choice` 6,
`gap` 5, `pick-sentence` 3, `transform` 2. The two lessons about negatives and
questions lean on `transform` (4–5 each) the way `present-simple/04` and `/05`
already do.

Schema details that are easy to get wrong:

- `pick-sentence` takes **exactly two** options — right form against the
  plausible wrong one, never three.
- a `gap` in the negatives or questions lesson needs `task: "negative"` or
  `task: "question"`. Without it the sentence gives no sign what the blank
  wants, and the item is unanswerable.
- when the trailing `(word)` cannot be the cue — because writing it would give
  the answer away — use the `cue` field. A cue is never a form of the answer.
- `accept` carries the contraction's twin: `didn't` / `did not`,
  `wasn't` / `was not`, `weren't` / `were not`. Missing these is the most
  likely source of a false "wrong" in the player.
- ids: `pst-form-01`, `pst-spell-01`, `pst-irr-01`, `pst-be-01`, `pst-neg-01`,
  `pst-quest-01`, `pst-test-01`, `pst-bank-01`. Bank ids must not repeat a
  lesson id — the loader rejects it, and reusing one would let Grammar Review
  re-ask a prompt the person just answered.

## 7. Wiring

`lib/courses/load.ts` — eight imports and one `PACKS` entry, matching the
existing blocks exactly:

```ts
"past-simple": {
  course: pastSimpleCourse,
  rules: pastSimpleRules,
  lessons: { forms, spelling, irregular, "was-were", negatives, questions, test },
  bank: pastSimpleBank,
},
```

`content/courses/catalog.json` — replace the Coming entry in the A1 group with
`{ "slug": "past-simple", "status": "available" }`, positioned **after**
`to-be-present`, since the Grammar list follows file order.

`content/courses/SOURCE.md` — one line: Past Simple is written; the A1 shelf
still holds there is / can / have got / present continuous / articles.

## 8. Audio

`npm run courses:audio` records `example.en` and every `transform` source.
Three courses currently produce 51 phrases / 1 121 characters, so Past Simple
adds roughly 400 characters — about **$0.006** at $15 per million. Cost is not
the reason to be careful; an immutable upload is.

1. `npm run courses:audio -- --dry-run` and read the sample lines. Anything
   awkward gets fixed in the JSON *before* it is recorded.
2. Then the real run. The script writes the manifest after each upload, so a
   failure halfway does not re-charge for what already landed.
3. Commit `content/courses/audio-manifest.json` with the content.

## 9. Slices, in the order they should land

Each is a commit on `feat/past-simple`, each verified before the next.

1. **Skeleton, invisible.** `course.json`, `rules.json`, all seven lesson files
   with theory and *one* exercise each, a stub bank; register in `load.ts`;
   leave `catalog.json` on Coming. Add a `past-simple pack` block to
   `tests/unit/courses-schema.test.ts` asserting slugs, lesson order and the
   eleven rule ids. `loadCourse("past-simple")` will throw on the counts — that
   is the point: the failing invariant is the to-do list.
   *Verify:* `npm test` — the new pack test fails only on exercise counts.
2. **Lessons 1–3** to full 16 each, plus their bank items.
3. **Lessons 4–6** to full 16 each, plus their bank items.
4. **Test lesson** to 12, bank to 26. Now `loadCourse` passes.
   *Verify:* `npm test` green, `npm run typecheck`.
5. **Audio**, per §8.
6. **Go live.** Flip `catalog.json`; update
   `tests/unit/courses-catalog.test.ts` (the available-slug array and the
   `coming[0]` assertion, which will now be a different course); touch
   `SOURCE.md`.
   *Verify:* `npm test`, `npm run lint`, `npm run build`. Then
   `npm run dev` and walk the course in the browser: outline, one lesson end to
   end, a deliberate miss, the test, and Grammar Review the next day — set the
   timezone cookie forward rather than waiting.
7. **Review, then merge.** Present the diff; merge to `main` only on the
   maintainer's word. `main` is a release.

## 10. Risks

- **The content is the project.** 134 exercises written in one sitting go
  stale in quality around item 60. The slices exist so each lesson is written,
  read, and committed on its own.
- **A wrong `accept` list reads as a bug.** The player marks a correct
  contraction wrong and the rule gets scheduled for review. Walking one lesson
  in the browser catches this; unit tests do not.
- **Rule granularity is a one-way door.** `GrammarRuleMemory` rows key on
  `ruleId`. Splitting `pst-spelling-double` into two rules after release
  orphans whatever was already scheduled. Decide the eleven now.
- **Watch the catalog threshold.** `CATALOG_CHROME_MIN_COURSES = 6` turns on
  search, sort and CEFR shelves. This course makes four. Two more and the
  Grammar page changes shape on its own — worth looking at then, not now.
