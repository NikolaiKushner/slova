# Stories — specification

Status: drafted 2026-08-19, awaiting maintainer approval
Route: `/stories`, `/stories/[slug]`
Navigation: third item in Study, after Trainings and Grammar
Containers: catalog `container-list` (780), reader `container-prose` (700)

Source documents (Notion, all `Accepted`):

- [Story: персональные истории из слов пользователя](https://app.notion.com/p/3bf23c2a7cbc81e8bb6ace2e9a27d578) — product decision
- [`plans/personalized-stories.md`](https://app.notion.com/p/3bf23c2a7cbc816e95bfce1c2135eae4) — technical specification
- [`plans/personalized-stories-implementation.md`](https://app.notion.com/p/3bf23c2a7cbc8134b784f48bfa79db63) — lean MVP plan

This file is the repository-side specification and wins where it disagrees with
Notion. Section 3 says where, and why.

## 1. What this is

A third activity in Study: ten short English stories, 120–180 words, ordered
against the words the learner already has in Slova. The learner reads, taps an
underlined word to see what it means *in that sentence*, may add a new word to
their dictionary, then answers two comprehension questions and one cloze.

The learner-facing path makes **zero AI provider calls**. AI writes drafts
offline, a human approves them, and approved text ships in the repository.

## 2. Scope: one learner

`docs/product-scope.md` is the sizing constraint and it applies hard here:
Slova has one user, may gain a few, and expects no growth in the near term. The
Notion documents were written for a product with a content pipeline, an
inventory policy and an operator role. This specification is written for ten
stories and one reader.

Three consequences, applied throughout:

- **Editorial control replaces computation.** A human reads every story before
  it ships. That is a better difficulty judge than any runtime measurement, and
  it means the app does not need to measure.
- **Ten items need no ranking engine.** Sorting, not scoring.
- **No adversary.** No cheat-proofing, no answer-key ceremony, no anti-tamper
  verification against the person who wrote the stories.

Section 3.4 lists what was cut for these reasons, so the reasoning survives
even if the constraint changes.

## 3. Departures from the Notion plan

### 3.1 Content lives in the repository, not Postgres

The Notion plan proposes `Story` and `StoryVersion` tables plus
`scripts/stories.ts` with `validate`, `import`, `publish` and `list`, a
`contentHash` uniqueness rule, a transactional publication path and concurrency
tests.

Grammar courses already solved this the other way and shipped:
`content/courses/` holds JSON, `content/courses/schema.ts` holds the Zod
contract, `lib/courses/load.ts` statically imports every file so it travels
with the serverless bundle, and Postgres stores only progress. A course change
is a commit.

Stories work identically, because:

1. **A story is prose that needs a human to read it, and git is the review
   tool.** The whole quality argument rests on that review step. A pull-request
   diff gives it for free, with history and revert. Postgres offers no review
   surface, which is why the plan had to invent a CLI and then exclude the admin
   UI that would have made it usable.
2. **One content mechanism instead of two.** Teaching material already has a
   home in this codebase.
3. **It deletes most of the build** — both content tables, import and publish
   services, the CLI, hash uniqueness, publication transactions and the
   concurrency tests.
4. **Rendering a story needs no query.** Only the learner's own progress is
   read from the database.

Costs, stated plainly: a typo fix needs a deploy (already true of every grammar
lesson), ~10 KB of JSON per story in the server bundle, and static imports stop
being pleasant somewhere past ~50 stories. That last one is the trigger to
revisit — along with somebody who does not use git wanting to author a story.

The choice is cheap to reverse. `StoryProgress` references a story by slug with
no foreign key, the same deliberate looseness `UserWord.lexemeId` has, so
content can move into Postgres later without touching a single progress row.

### 3.2 The reader shell is the lesson, not focus mode

Design-system §15.2 builds focus mode around a fixed 186px task zone — geometry
for one question at a time. A 150-word text does not fit it. §15.6, the lesson,
is the right model: container 700, top bar, sticky bottom bar.

### 3.3 The nav slot the product doc asks for is taken

The product document puts Stories third in Study. That slot was filled last
week: commit `951f1ed` and `docs/design-system.md` §15.1 and §15.7 make **My
progress** the third Study item. Study becomes:

```
Study      Trainings · Grammar · Stories · My progress
Dictionary My words · My sets
```

Three activities, then the report about them. This needs the §15.1 amendment in
the same branch — the sidebar sentence names its items, and per `CLAUDE.md` the
document outranks the code.

`app/(app)/practice/reading/page.tsx` is a `ComingSoon` stub today. It becomes a
redirect to `/stories`, is listed in the nav item's `matches`, and the
`comingSoon.readingPractice` copy is deleted from both message files.

### 3.4 Five defects, and why four of them are now moot

The Notion plan had five real problems. Fixing three of them turned out to mean
deleting the mechanism that had them.

**Runtime coverage measurement is removed entirely.** The plan gated
suitability on unknown-token coverage — ≤2% for A1, ≤3% for A2 — and that gate
is arithmetically impossible: in a 150-token story, 2% is 3 tokens, while the
same documents require 2–4 new words that should each recur in more than one
context. Three new words appearing twice is 4%: fails the gate, satisfies every
content rule. Every A1 story would have been rejected for every learner. The
two Notion documents also disagree — the source specification says "at most two
unknown *items*", a type count, which is at least coherent.

Underneath that, the repository has **no lemmatizer**. The plan says to add one
"only if the existing helpers cannot satisfy inflection fixtures", naming
`lib/lexicon/normalize.ts`, which does not exist (it is `lib/normalize.ts`), and
`lib/lexicon/forms.ts`, which is the irregular-**verb** table for the verb
trainer. `normalizeKey` folds case, quotes, list markers and ё/е and does
nothing to inflection, so `keys` misses `key` and `found` misses `find`.
Coverage would have been wrong in the direction of "the learner knows less than
they do", silently.

The fix in the previous draft was to author a lemma for every content token and
validate exhaustively. It worked, and it was too much: it made annotation the
expensive part of writing a story, and it added a 300-entry baseline word list
to maintain.

The 95/98% coverage research ([Hu & Nation, *Reading in a Foreign
Language*](https://files.eric.ed.gov/fulltext/EJ887873.pdf); [*Applied
Linguistics* 2024](https://academic.oup.com/applij/article/45/6/953/7841943))
is real, and it is a constraint on **writing** the story — which the blueprints,
the declared CEFR level and a human reading the draft already enforce. It is
not a constraint the app has to re-derive at request time from a dictionary
that cannot handle plurals. Ten curated A1/A2 stories are comprehensible
because someone checked, not because a percentage was computed.

So: no coverage gate, no token lemmas, no baseline list, no `lexical.ts`, no
cold-start fallback machinery. Selection uses authored focus lemmas only
(section 5.3), which is data the file already carries and which needs no
inflection handling at all. The catalog can still say "6 of your words, 2 new"
truthfully, because those are counted over authored lemmas.

**The cloze could be answered by copying.** The plan makes "cloze answer
appears in the source text" a validation *rule*, while the reader shows that
text with the focus words underlined. The exercise becomes transcription — the
exact failure the FSRS boundary exists to prevent — and it collides with
design-system §20, "do not show during a question anything that contains the
answer", which the document asks to be checked against every new practice
element.

This one is a real fix, not a deletion. Three parts: the questions phase
replaces the text rather than sitting under it; the cloze uses a sentence
written for the question, not a span lifted from the story; and there is no
re-read during questions, because a detail question's answer is in the text by
construction. Validation inverts — the cloze prompt must **not** appear in any
paragraph, and its answer must be a focus lemma that did occur.

**`addWords` does not have the shape the word-add route assumes.** It returns
counts, not rows, and requires a `back` the plan never sources. The gloss is
deliberately narrow — "running late" in this sentence — which is right to read
and wrong to study from six weeks later. Resolution order: the shared base
first (`lookupBatch` then `pickTranslation` on `normalizeKey(lemma)`), the
contextual gloss only as fallback. Either way it goes to `UserWord.back`, which
is user-owned, and never to `LexemeTranslation`. `source` is `story:<slug>`.
The route re-reads the row afterwards; `addWords` keeps its signature.

**Grading needs no server.** The plan requires server-side scoring and a DTO
that strips answer keys, with "the client never receives answer keys" in its
definition of done. `components/courses/exercise-view.tsx` already ships the
whole `Exercise` to the client and grades there with `gradeExercise`, recording
a score through `/api/courses/progress`. The only thing server grading buys is
protection against a learner cheating at their own vocabulary app. Stories grade
on the client and POST the result, exactly like courses. One question pattern,
no DTO ceremony.

What §20 actually forbids is showing the answer to the *reader* — labels, tab
titles, `aria-label`s. An answer key in a payload is not that.

## 4. Invariants

1. A learner request never calls an AI provider.
2. Reading, glossing, answering and completing do not touch `UserWord`
   schedules, `ReviewLog`, `stability`, `difficulty`, `srsState`,
   `intervalDays` or `dueAt`.
3. A word enters the dictionary only after an explicit learner action.
4. A contextual gloss never becomes a `LexemeTranslation`.
5. No paragraph text is in the DOM during the questions phase.
6. No cron, no generation tables, no provider batch code in the repository.

## 5. Content and code

```
content/stories/
  schema.ts       Zod contracts: story file, blueprint
  catalog.json    slug → level, order
  blueprints/     ten authoring briefs
  stories/        ten approved stories

lib/stories/
  load.ts         static imports, parse, catalog invariants
  validate.ts     the deterministic checks in 5.2
  select.ts       ordering and the counts the catalog shows
  progress.ts     answers and completion
```

Four modules. `load.ts` mirrors `lib/courses/load.ts`, static imports and all,
for the reason that file gives: the content has to travel with the serverless
bundle.

Blueprints stay in the repository although nothing at runtime reads them — they
are what a replacement draft is generated from, and section 8 is useless
without them.

### 5.1 Story file format

```ts
type StoryFile = {
  slug: string;
  schemaVersion: 1;
  level: "A1" | "A2";
  topic: string;
  blueprint: string;
  title: string;                 // English
  descriptionRu: string;         // one line, for the catalog row
  paragraphs: Array<{ id: string; text: string }>;
  annotations: Array<{
    id: string;
    paragraphId: string;
    surface: string;             // exactly as it appears
    occurrence: number;          // 1-based, within that paragraph
    lemma: string;               // dictionary form
    glossRu: string;             // the meaning in THIS sentence
    role: "focus" | "phrase" | "support";
  }>;
  questions: [Exercise, Exercise, Exercise];  // content/courses/schema
};
```

Annotations cover **the words that need a gloss**, not every token: the 5–8
focus words, any phrase, and any support word the author judges a learner might
not know. Completeness is a matter of authorial judgement checked in review, not
a validated property. That is the whole simplification of 3.4.

`wordCount` and `estimatedMinutes` are derived at load time, never authored.

### 5.2 Validated constraints

- 120–180 English words, 3–5 paragraphs;
- 5–8 `focus` annotations, each a real dictionary form;
- no Russian in `paragraphs`;
- ids unique across paragraphs, annotations and questions;
- `surface` + `occurrence` resolves to exactly one position — the loader
  computes offsets, the author never writes them;
- overlapping spans rejected unless the outer one is a `phrase`;
- exactly three questions: `choice`, `choice`, `gap`, in that order;
- every question has one defensible answer, and options are unique;
- the cloze prompt is **not** a substring of any paragraph, and its answer is a
  focus lemma occurring in the story (3.4).

### 5.3 Ordering, and the counts on the card

For each story, intersect its `focus` lemmas with the learner's dictionary,
matching `UserWord.key` against `normalizeKey(lemma)`, and classify with the
app's own definition — `ratingOf` from `lib/word-rating.ts`, where
`LEARNED_INTERVAL_DAYS = 21`:

| Focus lemma | Counts as |
|---|---|
| `UserWord`, rating 2–4 | **yours** — a word being learned |
| `UserWord`, rating 5 | known |
| `UserWord`, rating 1 (`introducedAt` null) | new |
| absent | new |

Reusing `ratingOf` keeps one definition of "learned" in the app. A
pasted-but-never-studied word counts as new on purpose: the learner has seen a
row in a table, not a word.

Then: hide completed stories, sort by *yours* descending, break ties by
`catalog.json` order, which is A1 before A2. That is the whole algorithm. Ten
stories and one reader do not need scoring, penalties, topic novelty or
contextual-diversity terms; those are for a library of hundreds and can be added
the day there is one.

A new learner has an empty dictionary, so every story scores zero and the first
A1 story comes up. That is correct behaviour and it needs no fallback path — the
catalog is never empty, so there is no empty state to design.

The card copy comes from the same counts: "6 ваших слов · 2 новых".

### 5.4 Data model — one table

```prisma
model StoryProgress {
  id           String    @id @default(cuid())
  userId       String
  storySlug    String
  /// Keyed by question id: { "q-main": { answer, correct, answeredAt } }
  answers      Json
  correctCount Int       @default(0)
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, storySlug])
  @@index([userId, completedAt])
}
```

One migration, `stories_progress`: one table and the `stories` relation on
`User`. No content in migration SQL, no foreign key to content.

No `contentVersion`, no content hash, no attempt history. Rewriting a story
after this learner has read it is a thing that will happen approximately never,
and if it does the answer is to delete one row. A version column, a hash
fixture test and re-read-as-unread semantics are three mechanisms guarding
against that.

### 5.5 Routes

Existing patterns: Auth.js session, Zod, `lib/rate-limit.ts`, `jsonError` from
`lib/i18n/api-error.ts`, structured logging. No GET API — Server Components call
`lib/stories/select.ts` directly, and no new caching configuration is
introduced.

**`POST /api/stories/[slug]/progress`** — a Zod discriminated union:

- `answer` — `{ action, questionId, answer, correct }`. Upsert the learner's
  row, store the answer by question id. A changed answer replaces the previous
  one until completion; a completed row is read-only.
- `complete` — `{ action }`. Require all three answered, set `completedAt`
  once, persist `correctCount`. Must not write `ReviewLog` or any FSRS field.

**`POST /api/stories/[slug]/words`** — `{ annotationId }`. Verify the
annotation belongs to that story, resolve the translation per 3.4, call
`addWords` with `source: "story:<slug>"`, re-read and return the `UserWord`.
Idempotent, because `addWords` already leaves an existing row and its schedule
untouched.

Gloss opening is client-only and not persisted.

## 6. Design

Read `docs/design-system.md` before writing either screen. Both are built from
`components/ui` and `components/slova`; every colour, size, radius and duration
below is a token that already exists.

The governing idea: **this is the one screen in Slova that is a reading
surface.** Everything else is a list, a form, or one question at a time. So the
reader gets one considered addition to the type scale and nothing else new, and
the catalog is built entirely from patterns the app already uses.

### 6.1 One type token is added: `story`

Literata was chosen because it "was made for long on-screen reading: moderate
stroke contrast, large x-height, calm serifs" (§2.1). Nothing in the app has
been long-form reading until now, so Literata appears only in headings, words in
practice and numerals, while `body` is Inter.

Story paragraphs are the case the typeface was picked for. Add one utility to
`app/globals.css` §9 and one row to `docs/design-system.md` §3:

| Token | Typeface | Weight | Desktop | Tablet | Phone | Line-height | Tracking | Where |
|---|---|---|---|---|---|---|---|---|
| `story` | Literata | 400 | 18 | 18 | 17 | 1.70 | 0 | Story paragraphs — the only continuous reading surface |

`font-variation-settings: "opsz" 20`, matching §2.1's rule binding `opsz` to
size for 17–24px. Weight 400, not the 500 every other Literata token uses: 500
at 18px across five paragraphs reads as emphasis, and this is text to be read,
not looked at. Line-height 1.70 rather than `body`'s 1.60 for the same reason.

Measure is `max-w-[68ch]` per §3 — ~610px at 18px, which is why the reader uses
`container-prose` (700) and not `container-list`.

No other new token, utility, component or colour. If something below seems to
need one, it is wrong.

### 6.2 Catalog — `/stories`

`PageContainer container="list"` (780), matching My words and the course
catalog. A list of things to do, not a dashboard.

```
PageHeader   eyebrow "Истории" · h1 "Истории" · lead, one quiet line
             ("Короткие тексты из слов, которые вы учите.")
─────────────────────────────────────────────────────────────
Next         one Card, the LessonRow kind="next" treatment
─────────────────────────────────────────────────────────────
Section      "Все истории"   → divided rows
─────────────────────────────────────────────────────────────
Section      "Прочитанные"   → Accordion, count in the trigger
```

Block rhythm 40 / 36 / 32 (§7). `Section` is the existing component; its
`title` renders as `overline` in `eyebrow`, as on My words.

**The first card.** Do not invent a hero. The design system already has an
idiom for "this is the one to do next": `LessonRow` `kind="next"` — background
one step off the card, a 2px left inset in `primary`, a badge. Reuse that
treatment. Contents:

1. `overline` in `eyebrow` — "Читать дальше";
2. title, `text-h3` Literata, `lang="en"`;
3. `descriptionRu`, `text-body-sm` in `muted-foreground`;
4. a facts row, `text-caption` with `tnum`, separated by `·` — "A1 · ~2 мин ·
   6 ваших слов · 2 новых". These are the counts from 5.3, and they are the
   promise of the whole section, so they sit in `foreground`, not muted grey;
5. `Button size="lg"` — "Читать".

**The list.** Rows, not cards — a card per story would make eight equally loud
boxes, the exact failure the progress page redesign fixed. Copy the course-row
implementation already in `app/(app)/progress/page.tsx`: a `<ul>` with
`divide-y divide-border`, each row one `Link` with `px-(--card-spacing) py-3`,
`hover:bg-muted/50`, `focus-visible:bg-muted/50` and an inset 2px ring.

Row: level chip (`overline` on `secondary`, `radius-xs`) · title `text-h4`
Literata `lang="en"` · `descriptionRu` as `text-caption` muted on a second line
· right side minutes in `text-caption tnum` and a `ChevronRight` at 15px,
`strokeWidth={1.9}` (§12). Padding 12×16 desktop, 14×16 touch.

**Completed.** An `Accordion`, collapsed, count in the trigger — the pattern the
course catalog uses for «Скоро». Rows carry a checkmark and "3 из 3" in `tnum`.

**States.** No empty state exists (5.3). Loading is `loading.tsx` with
`Skeleton` in the shape of the content — one tall block, then four rows. Not a
spinner (§16).

### 6.3 Reader, phase 1: reading

`PageContainer container="prose"` (700), modelled on the lesson (§15.6).

```
PageBack     "К историям"
h2           title, Literata, lang="en"
caption      "A1 · ~2 мин · нажмите подчёркнутое слово, чтобы увидеть перевод"
─────────────────────────────────────────────────────────────
paragraphs   text-story · 14px between paragraphs · max-w-[68ch]
─────────────────────────────────────────────────────────────
bottom bar   sticky · scrim-panel · border-top
             right: Button "Ответить на вопросы"
```

The affordance hint lives in the meta line, not a tooltip or a first-run
popover: §20 forbids hover as the only carrier of information, and the meta line
is read once, which is how often this needs saying.

**Glossable spans.** Exactly the annotated words are interactive, and exactly
those are marked — a 2px underline in `green-400`, the "in progress" data
colour, at 3px offset with `text-decoration-skip-ink: auto`. **Not** a
background fill: eight mint-filled words across five paragraphs reads as a
highlighter accident, and §15.7 already rejected filled backgrounds for data
accents.

Marking exactly what is tappable is what keeps this simple. There is no hidden
interactivity to teach, the paragraphs stay selectable, an iPad long-press
behaves normally, and tab order contains the ten or so spans that do something
rather than every word in the text.

- each span is a `<button>` in the text flow, so it is reachable and announced
  as interactive;
- `py-0.5 -my-0.5` widens the hit box without moving the line. An inline word
  cannot be a 44×44 target (§9); `text-story`'s 1.70 line-height is what keeps
  ≥8px between adjacent targets, which is the §9 rule that applies here;
- `touch-action: manipulation` on the spans.

**The gloss popover.** shadcn `Popover`, `popover` background, `radius-lg`,
`shadow-lifted`, max-width 300px, `motion-base` (240ms):

1. **Row 1** — the surface as it appears, `text-h4` Literata `lang="en"`; then
   the base form in `<Token>` *only when it differs from the surface*. That is
   what `<Token>` is for (`work → works`), and it is how the learner discovers
   that `found` is `find` — the one thing this popover teaches that a
   translation cannot.
2. **Sound** — `SpeakButton` at icon size, right-aligned in row 1. With no
   audio on the shared lexeme: `disabled` plus a `Tooltip` reading
   "Произношение появится позже". §16 specifies that exact behaviour already.
3. **Row 2** — the contextual gloss, `text-body-sm` in `foreground`. Not muted:
   it is the payload.
4. **Row 3** — dictionary state, one `text-caption` line in `muted-foreground`:
   "В вашем словаре · выучено" / "Учите" / "Нет в словаре". Words, not the
   `WordRow` five-dot scale — a popover is not the place for a second
   visualization.
5. **Action** — when the word is absent, a full-width `Button size="sm"`,
   "Добавить". After adding it becomes "Добавлено" in `text-caption`.

A `phrase` annotation takes precedence: tapping any word inside `give up` opens
the phrase, with the phrase in row 1. `Esc` closes and returns focus to the
span.

### 6.4 Reader, phase 2: questions

The text is **replaced**, not pushed down (3.4). Transition per §11: the old
leaves `opacity 0 → translateY(-4px)`, the new arrives from `translateY(6px)`,
`motion-page` 400ms, no horizontal movement.

- the top bar gains `ProgressSteps` with three segments and "Вопрос N из 3" —
  the §15.6 lesson idiom;
- questions render through `GrammarQuestion` from
  `components/courses/exercise-view.tsx`, which routes `choice` to
  `OptionButton`/`OptionList` and `gap` to an input. §14 is explicit that
  `OptionButton` is "used in all practice and in lesson practice with no
  exceptions", so this is mandatory, not a preference;
- answer options always in one column (§8);
- `AnswerFeedback` under the answer at its fixed 44px, so a verdict shifts
  nothing;
- one question at a time, which also keeps §20 trivially satisfiable;
- the cloze input is a normal `Input` at ≥16px with `autocapitalize="none"`,
  `autocorrect="off"`, `spellcheck="false"` (§9), and **no autofocus on touch**
  — autofocus on iPad covers half the screen;
- **no re-read control** (3.4). It appears after completion.

### 6.5 Reader, phase 3: summary

Replaces the questions in place; not a new route. Model it on
`components/practice/drill-summary.tsx` so a finished story feels like a
finished training.

- `text-h2` "История прочитана" and one `caption` line;
- three facts in a row that collapses to one column below 390px — the
  breakpoint the progress grid uses. Number in `text-h3` Literata, label in
  `text-caption`: "Вопросы 3 из 3" · "Слова в контексте 6" · "Добавлено 2".
  **Not `MetricTile`** — §15.7 confines metric tiles to `/progress`, and this
  is the kind of drift that ruling exists to prevent;
- primary `Button` "Тренировать эти слова" → `/practice`. This is the loop the
  product document is built around — story to training — and it should be the
  loudest thing on the screen;
- `ghost` "Прочитать снова", which reveals the text again;
- a `link` button back to `/stories`.

### 6.6 Everything else

- **Loading** — `loading.tsx` on both routes, `Skeleton` shaped like the
  content: for the reader, a title block and four paragraph blocks of
  decreasing width (§16).
- **Errors** — `Alert variant="destructive"` in the page body with a retry
  action. Toasts are for background operations only (§16).
- **Touch** — bottom bar 64px + `env(safe-area-inset-bottom)`;
  `overscroll-behavior: none`; check 768, 834, 1024 and 1194 (§9).
- **Reduced motion** — `prefers-reduced-motion` collapses every transition to
  0.01ms, the phase change included (§11).
- **Dark theme** — free, because nothing above names a colour that is not a
  token.
- **Verify in a browser.** Per `CLAUDE.md`, a screen that has only been
  type-checked has not been checked. Phone, tablet, desktop, keyboard only.

### 6.7 What not to build

In the spirit of §20, and because every reading app on the market does these:

- no cover images or illustrations — §20 bans photographs and stock
  illustrations, and ten generated covers would be the most expensive, least
  useful thing in this feature;
- no reading-time ring or percentage-read indicator;
- no per-word difficulty badges, stars or heat colouring in the text;
- no highlighter-style background fills;
- no XP, streak bonus, confetti or medal on completion — the product document is
  explicit that Stories gets no "separate economy of points or new activity
  streak";
- no metric tiles outside `/progress`;
- no second accent colour for "new" versus "learning" words. One underline, or
  nothing.

## 7. The FSRS boundary

Exposure is not retrieval. Not a review: being shown a story, seeing an
underline, opening a gloss, finishing the text, answering a question,
completing the story.

Possible weak signals later — a correct cloze retrieval, a comprehension answer
that depends on a focus word. They stay out of FSRS until there is evidence they
predict later recall, which needs analytics section 9 defers.

## 8. Writing the ten stories

Six A1 and four A2, from the blueprints approved in the source specification:
`missing-key`, `wrong-coffee`, `dinner-without-list`, `first-day`,
`way-to-library`, `package-next-door`, `bus-is-gone`, `rainy-weekend`,
`no-battery`, `wrong-room`.

No batch API, no provider integration, no budget tables:

1. write the ten blueprint files;
2. ask for one structured draft per blueprint — prose, glosses and questions;
3. `npm test`, which validates every file in `content/stories/stories/`;
4. read each draft for naturalness, gloss accuracy in context, and question
   ambiguity;
5. ask for a replacement only where one fails or reads badly;
6. commit the ten.

Roughly ten requests in an ordinary session. Nothing is generated at request
time, so the privacy rules of the source specification hold trivially: no
prompt contains an email, a user id, a set name, or any study history.

## 9. Deferred

Recorded so nobody rebuilds them from the Notion documents by mistake:

the weekly cron and its inventory policy; the "ten suitable unread stories"
threshold; the active-reader definition; Message Batches integration;
`StoryGenerationBatch`, `StoryGenerationItem`, generation fingerprints and job
locks; the separate generation budget; a draft/review queue; an admin or review
UI; `StoryReport`; `StoryEvent` and per-gloss analytics; attempt history;
audio; learner-selected sets as a filter; arbitrary text import; runtime
coverage measurement and the lemma baseline (3.4).

`docs/product-scope.md` rules out cron-shaped background machinery and admin
panels at the current size, and an inventory policy cannot be evaluated before
anyone has read a story. Revisit the cron only if repeat reading appears and the
library runs dry; the source specification's design for it is good and should be
lifted from Notion unchanged when that day comes.

## 10. Tests

Keep `tests/unit` in step, per `CLAUDE.md`.

**Unit** — story and blueprint Zod parsing; word, paragraph, focus and question
counts; duplicate ids; annotation occurrence resolution and phrase overlap; the
cloze prompt not appearing in the text; `gradeExercise` over every shipped
question; focus-lemma classification against `ratingOf`; ordering with words
being learned, an empty dictionary and completed stories; `activeNavHref` for
`/stories`, `/stories/[slug]` and `/practice/reading`.

**Integration** — the migration on a clean and on the current schema; progress
upsert scoped to the authenticated user; a completed row rejecting changes;
translation resolution order; word addition preserving an existing `UserWord`
schedule; the gloss absent from `LexemeTranslation`; completion leaving
`UserWord`, `ReviewLog` and every FSRS field byte-identical.

**End-to-end** — one path: open the catalog, read a story, open a gloss by
keyboard, add a word, answer three questions, complete, reload and see the
result; plus an assertion that no paragraph text is in the DOM during the
questions phase. E2e is slow and brittle; the rest belongs in unit tests.

Gates before merging: `npm test`, `npm run test:integration`,
`npm run test:e2e`, `npm run lint`, `npm run typecheck`,
`npm run check:lockfile`, `npm run build`. Read the installed Next.js docs
under `node_modules/next/dist/docs/` before writing the routes.

## 11. Phases

One branch, several commits, merged when the batch is ready — per `CLAUDE.md`.

- **0 — contracts and content** (1–2 days). `content/stories/schema.ts`, the
  ten blueprints, `validate.ts` with failing tests first, then the ten drafts
  written, reviewed and committed. Exit: ten stories in the repository, green,
  with no Prisma and no UI.
- **1 — selection and design foundations** (1 day). `load.ts`, `select.ts` and
  its tests; the `story` type token in `app/globals.css` and
  `docs/design-system.md` §3; the §15.1 sidebar amendment and a §15.8 for the
  two screens; nav, icon, both locales.
- **2 — screens** (2–3 days). Catalog, reader, gloss popover, phase
  transition, loading states. Verified in a browser at four widths and by
  keyboard.
- **3 — progress and release** (1–2 days). The migration, both routes,
  completion summary, explicit word addition, the no-FSRS assertions; full
  suite; a human read of all ten stories; turn on the nav item.

Five to eight days, against ten to fourteen for the previous draft. The
difference is almost entirely section 3.4.

## 12. Decisions

1. **Content in the repository, not Postgres** (3.1). A story is prose needing
   review and git is the review tool. Reversible for free, because
   `StoryProgress` has no foreign key to content.
2. **No runtime coverage measurement** (3.4). Comprehensibility is enforced by
   the blueprint, the declared level and a human reading the draft. Selection
   uses authored focus lemmas, which need no inflection handling.
3. **Client-side grading** (3.4), like courses. One question pattern.
4. **One progress table, no content versioning** (5.4).
5. **Sidebar order: Trainings · Grammar · Stories · My progress** (3.3), with
   the §15.1 amendment.

Open, both cheap to change and both better answered by looking at a real
screen: whether ~610px of measure feels right on a large monitor (if not, change
the measure, never the type size), and whether «Истории» reads well beside
«Тренировки» and «Грамматика» in the live sidebar.
