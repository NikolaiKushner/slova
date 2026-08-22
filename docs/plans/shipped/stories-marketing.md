# Stories marketing alignment — specification

**Status:** shipped 2026-08-21. Kept because code comments cite it — see `CLAUDE.md` → Plans.

Status: proposed 2026-08-19, awaiting maintainer approval  
Primary surface: `/`  
Supporting surfaces: root metadata, `README.md`, public product stills  
Implementation size: one focused pull request, no database or API changes

## 1. Decision

Update the public story of Slova now that Stories is a shipped part of the
product. The landing will keep the existing promise — bring your own English
words and practise them — and add the missing payoff: meet those words again in
short, levelled stories with contextual glosses and comprehension questions.

The work has three visible outcomes:

1. The hero depicts the real signed-in entry screen, Trainings, instead of the
   removed Today screen.
2. The landing gains a dedicated Stories section with a still derived from a
   real story file, not a hand-written fictional product state.
3. The README and metadata describe Stories alongside vocabulary practice and
   grammar.

It also removes the structural cause of the current drift: the decorative app
shell must render the same `NAV_SECTIONS` data as the real sidebar. It must not
maintain a second list of sections or a special `"today" | "courses"` active
state.

This is a marketing-alignment change, not a Stories redesign. The real catalog,
reader, selection algorithm, progress model and story content remain unchanged.

## 2. Why this shape

Stories should be presented as a continuation of the learner's vocabulary
loop, not as an unrelated library:

```text
bring your words
      ↓
active practice
      ↓
meet words in a short context
      ↓
check understanding
      ↓
return when words are due
```

That framing is both true of the implementation and more distinctive than a
generic “we also have short stories” claim:

- the catalog orders unread stories by overlap with the learner's dictionary;
- annotated words expose a contextual gloss and can be added to the dictionary;
- each story ends with exactly three comprehension questions;
- the learner-facing path is curated and makes no AI call;
- stories are short A1/A2 reading sessions, not a claim to be a general ebook
  reader.

The landing must therefore show the interaction that explains the value — an
underlined word and its open contextual gloss — rather than only showing a grid
of story titles.

### 2.1 Research translated into product choices

The following sources are directional evidence, not copy to imitate:

- Duolingo describes Stories as bite-sized reading that puts words and grammar
  into realistic context and checks comprehension. It also treats context clues
  as the bridge between familiar and new language.
  <https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-reading-skills/>
- Duolingo's difficulty guidance says Stories deliberately contain mostly
  familiar material, with a small amount of new language and help around the
  unfamiliar parts. Slova cannot claim the same 90/10 curriculum ratio, but it
  can truthfully lead with the learner's existing words and contextual help.
  <https://blog.duolingo.com/right-level-of-difficulty/>
- LingQ makes the connection between a personal vocabulary database, content
  selection and words highlighted in context explicit. This supports making
  personalization part of the section copy, not an invisible implementation
  detail.
  <https://www.lingq.com/en/learn-english-online/>
- Readlang's landing demonstrates the interaction before explaining the
  machinery: click a word, see its contextual meaning, save it for practice.
  That supports a reader still with one open gloss rather than a catalog still.
  <https://readlang.com/>

The marketing claim must stay narrower than those products. Slova has ten
curated stories at launch, English-to-Russian support, no story audio and no
arbitrary imported reading. Do not use “endless content”, “authentic content”,
“AI explanations”, “learn naturally” or any fluency claim.

## 3. Current drift

### 3.1 Landing

`app/(public)/page.tsx` currently has this order:

```text
header
hero + Today still
numbers
four-step rail
Dictionary
Practice
Courses
closing CTA + footer
```

There is no Stories mention or preview. The hero title, body and closing CTA
reduce the product to a list plus grammar. The four-step rail does the same.

### 3.2 Decorative application shell

`components/product-frame.tsx` hard-codes a historical navigation model:

```text
Tasks       Today
Practice    Trainings
Courses     Grammar
Dictionary  My words
```

The live shell is defined by `lib/nav.ts`:

```text
Study       Trainings · Grammar · Stories · My progress
Dictionary  My words · My sets
```

`TodayScreen` depicts a route that was deliberately removed. The `active`
prop accepts historical concepts instead of live hrefs. Reusing design tokens
did not prevent content drift.

### 3.3 Public description

- `README.md` omits Stories from both the introduction and Screens table.
- The README says “Seven ways” while the catalog and landing expose eight
  training entries. This change should correct the nearby stale sentence while
  the file is already in scope.
- `messages/{ru,en}.json` metadata mentions words and grammar only.
- `docs/design-system.md` section 15.3 freezes the old landing order and must be
  updated in the same change.

## 4. Goals and non-goals

### 4.1 Goals

- A first-time visitor can understand in one scroll that Slova connects their
  own word list, active recall, grammar and contextual reading.
- Stories receives one full landing section, equal in visual weight to
  Dictionary and Grammar.
- Every visible application section in the hero shell matches the live sidebar
  in label and order.
- The Stories still demonstrates a real reader interaction and stays tied to
  validated repository content.
- Russian and English public copy remain structurally identical.
- The landing stays a Server Component and adds no client JavaScript, request,
  image payload or animation.
- README, metadata and the design-system contract agree with the shipped
  surface.

### 4.2 Explicitly out of scope

- Changing `/stories` or `/stories/[slug]` behavior or visual design.
- Adding stories, generating story illustrations or adding story audio.
- Making a public interactive demo, opening real popovers or linking inside a
  decorative still.
- Adding pricing, testimonials, screenshots, a carousel or autoplay motion.
- Rewriting authentication-page copy. Those pages use a narrow form layout and
  do not depict the removed navigation.
- Replacing the current bilingual word-pair Open Graph artwork. It still represents
  the core product accurately. If the artwork changes later, use a versioned
  asset URL as required by the existing OG route contract.
- Claiming that every story contains a learner's words. Story order is
  personalized by overlap, but a new or small dictionary can have zero overlap.
- Adding analytics events beyond the global page analytics already present.

## 5. Marketing narrative

### 5.1 Positioning hierarchy

Copy must preserve this order of importance:

1. **Input:** the learner brings the English words they actually need.
2. **Practice:** Slova turns them into several active-recall formats and brings
   them back on schedule.
3. **Context:** short stories make familiar words appear in connected English,
   with help one tap away.
4. **Structure:** grammar courses explain a rule and immediately practise it.

Stories broadens the product promise; it does not replace the bring-your-own-
words differentiator.

### 5.2 Copy rules

- Lead with learner outcomes, then explain the mechanism.
- Say “short stories” and name the A1/A2 levels when useful.
- Say stories are ordered by words from the learner's dictionary, not that they
  are generated for the learner.
- Say a tap reveals the meaning “in this sentence” or “in context”.
- Say the questions check understanding; do not imply a certified assessment.
- Keep the current restrained tone. No exclamation marks, streak pressure,
  mascot language or vague “immersive” claims.
- Keep all localized copy in `messages/ru.json` and `messages/en.json`. This
  document defines English intent only, in accordance with the repository rule
  for planning documents.

### 5.3 Hero copy contract

Keep the existing key shape unless splitting the heading materially improves
line wrapping:

| Key | Required meaning |
|---|---|
| `landing.eyebrow` | English study built around the learner's words |
| `landing.heroTitle1` | Bring or add the words the learner needs |
| `landing.heroTitle2` | Practise them and meet them in use |
| `landing.heroBody` | Translations fill automatically; trainings, short stories and grammar turn the list into a learning loop; due words return on schedule |
| `landing.createAccount` | Existing account-creation action; unchanged |
| `landing.haveAccount` | Existing sign-in action; unchanged |

The heading should fit in roughly `13ch` at the current display size in both
locales. Do not enumerate every feature in the heading.

### 5.4 Four-step rail

Replace the grammar-specific third step with context and let the dedicated
Grammar section explain courses in full:

| Position | Icon | Key pair | Meaning |
|---:|---|---|---|
| 1 | `ListPlus` | existing paste keys | Add a list; translations fill in |
| 2 | `Repeat` | existing study keys | Practise through several question formats |
| 3 | `BookOpenText` | new context keys | Read short stories chosen around familiar words; tap for help |
| 4 | `CalendarCheck` | existing due keys | The scheduler brings words back |

Remove `landing.stepRuleTitle` and `landing.stepRuleBody` only after `rg`
confirms they have no consumer outside the landing. Add:

```text
landing.stepContextTitle
landing.stepContextBody
```

The rail is a lifecycle, not a complete feature index. Grammar remains visible
in the hero body and its own section.

## 6. Landing composition

Update `docs/design-system.md` section 15.3 and implement this exact order:

```text
header
hero: product promise + current Trainings window
numbers bar
four-step lifecycle
Dictionary section
Practice section
Stories section
Grammar section
dark closing CTA + footer
```

Dictionary → Practice → Stories forms one continuous vocabulary narrative.
Grammar then shows the parallel structured-learning branch before the close.
This puts the new feature above the fold on many desktop second screens without
turning it into the whole identity of the product.

Keep the current `MARKETING` width, vertical `BAND` rhythm and single inverted
closing band. Do not introduce a new full-width color band for Stories.

### 6.1 Hero

Replace:

```tsx
<ProductFrame>
  <TodayScreen />
</ProductFrame>
```

with the conceptual equivalent of:

```tsx
<ProductFrame activeHref="/practice">
  <TrainingsOverviewStill />
</ProductFrame>
```

`TrainingsOverviewStill` is a compact, non-interactive rendering of the top of
the real Trainings page:

- overline and title from the existing `practice` namespace;
- one static source-bar row showing a plausible source such as due words;
- two compact start cards: mixed review and Brainstorm;
- no fetched counts, user streak or fabricated personal history;
- labels come from the same `practice` and `trainings` message keys as the live
  page wherever the wording is identical.

The still is not an attempt to embed `PracticePage`: the live component is a
client component that fetches counts and navigates. The still is server-rendered
decorative markup with the same information hierarchy.

Use neutral placeholders where a count would imply real learner data. Prefer a
label like “due words” without a number over “12 words due”.

### 6.2 Numbers bar

Keep all three current facts:

- shared dictionary size;
- `TRAININGS.length` question/training formats;
- one list translation request in the paid miss case.

Stories has no stable, impressive count worth promoting in this bar. “10
stories” would make a curated launch catalog sound artificially small and would
become another copy value to maintain. The dedicated section carries the value.

### 6.3 Dictionary and Practice

Keep their layout and stills. Correct the Practice title/body so they agree with
`TRAININGS.length`; do not spell “seven” in either locale. The preferred
contract is a count interpolation:

```text
landing.practiceTitle({count: TRAININGS.length})
```

If the locale grammar makes a title interpolation awkward, use a count-free
title and retain the computed chip list. Do not hard-code another numeric count.

### 6.4 Stories section

Insert Stories between Practice and Grammar:

```text
desktop: copy 0.86fr | reader still 1.14fr
mobile:  copy first, still second
```

This mirrors the Dictionary section and alternates visual weight with Grammar.
Use the same `ProductFrame chrome="panel"`; do not use window chrome twice.

Copy contract:

| Key | Required meaning |
|---|---|
| `landing.storiesEyebrow` | Stories |
| `landing.storiesTitle` | Familiar words become connected English, not isolated cards |
| `landing.storiesBody` | Short A1/A2 stories are ordered around words in the learner's dictionary; tap an underlined word for its contextual meaning, then answer three questions |
| `landing.storiesPillContext` | Meaning in context |
| `landing.storiesPillQuestions` | Three quick questions |

The body may mention “your words first”, but it must not promise a non-zero
overlap. Do not add a CTA inside this section: `/stories` requires an account,
and the page already has primary signup actions at the beginning and end.

### 6.5 Stories reader still

Create `StoryReaderStill`, a decorative rendering of a real reading state. It
contains:

1. story title;
2. level and estimated minutes;
3. one real paragraph excerpt, clipped to a useful length;
4. real annotated surfaces with the reader's underline treatment;
5. one permanently open, static gloss card for the chosen annotation;
6. a quiet visual hint of the “answer questions” action at the bottom.

Use `bus-is-gone` and annotation `a-pulled-away` initially because the phrase
shows why a contextual gloss is more useful than a dictionary word pair. These
identifiers live in one server-only adapter, not scattered through JSX:

```ts
export const MARKETING_STORY = {
  slug: "bus-is-gone",
  paragraphId: "p2",
  openAnnotationId: "a-pulled-away",
} as const;
```

Add `lib/stories/marketing.ts` with a pure `loadMarketingStoryStill()` adapter.
It must:

- call `loadStory(MARKETING_STORY.slug)`, thereby retaining all current schema
  and cross-field validation;
- find the configured paragraph and annotation or throw `StoryContentError`
  with a precise identifier;
- use `buildParagraphSegments` from `lib/stories/reader-view.ts` rather than a
  second occurrence/substring implementation;
- return a small serializable DTO containing title, level, estimated minutes,
  paragraph segments and the selected annotation's surface, lemma and gloss;
- contain no Prisma, session, cookie or network access.

`app/(public)/page.tsx` loads the DTO as part of its existing Server Component
render and passes it to `StoryReaderStill`. This does not make the landing a
Client Component and does not add a runtime content request: story JSON is
already bundled through static imports in `lib/stories/load.ts`.

The still must not reuse the live `Popover`, `SpeakButton` or dictionary action.
Those controls would add client behavior and create misleading affordances on
an `aria-hidden`, pointer-disabled surface. Render a static card with the same
tokens instead.

Do not show:

- “your words” or “new words” counts, because there is no anonymous learner;
- added/not-added dictionary state;
- audio, because Stories does not provide story narration;
- a completion state or score;
- an invented cover image.

### 6.6 Grammar section

Rename code-level marketing terminology from `CourseScreen` to
`GrammarCourseStill` and from `active="courses"` to
`activeHref="/courses/grammar"`. User-facing course copy can remain mostly
unchanged, but use `landing.grammar*` keys instead of the broad
`landing.courses*` keys if those keys have no other consumers.

The real navigation section is Study and the destination is Grammar. The
marketing component should use the product's noun, not preserve an obsolete
top-level Courses section.

### 6.7 Closing CTA

Keep one strong signup action and the inverted band. Replace the binary “list
or course” framing with a single invitation to bring the learner's words and
use them across practice, stories and grammar. The body may retain the concrete
speed advantage of the first pasted list.

Do not present three competing buttons for Dictionary, Stories and Grammar.
There is one unauthenticated next step: create an account.

## 7. Drift-resistant decorative shell

### 7.1 API

Change `ProductFrame` from historical semantic states to live routes:

```ts
type ProductFrameProps = {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  activeHref?: NavItem["href"];
  chrome?: "window" | "panel";
};
```

In practice TypeScript may derive a narrower union from `NAV_SECTIONS`; do not
duplicate the href literals just to obtain a type. Default `activeHref` to
`/practice`, the real signed-in home.

### 7.2 Rendering

For `chrome="window"`, iterate over `NAV_SECTIONS`:

```tsx
{NAV_SECTIONS.map((section) => (
  <section key={section.titleKey}>
    <p>{t(section.titleKey)}</p>
    {section.items.map((item) => (
      <p data-active={item.href === activeHref} key={item.href}>
        {t(item.titleKey)}
      </p>
    ))}
  </section>
))}
```

Match the real labels and order, but keep the miniature shell's simplified
visual treatment. Icons are unnecessary at this size. `matches` are irrelevant
because the prop is already the owning href.

The sidebar will contain six items instead of the current four. To preserve the
hero composition:

- keep the sidebar width at 150px on `sm` and above;
- reduce only vertical sidebar gaps if required; do not hide Stories or My
  progress;
- let the content determine frame height; do not add an internal scrollbar;
- keep the sidebar hidden below `sm`, as today.

### 7.3 Component cleanup

After the new hero lands:

- delete `TodayScreen`;
- delete `product.today*`, `product.yourWords`, `product.learned`,
  `product.learning`, `product.notStarted` and `product.studyNow` only when `rg`
  confirms no remaining use;
- remove stale `nav.tasks`, `nav.today`, `nav.courses` and `nav.practice` only
  when the same search confirms they are not used by another public or legacy
  surface;
- do not remove live redirect routes merely because their labels disappear from
  translations.

## 8. Internationalization and metadata

### 8.1 Message ownership

Use existing product namespaces when a still repeats live UI:

- `nav` for shell labels;
- `practice` and `trainings` for the Trainings still;
- `stories` for exact reader labels such as minutes or answer questions;
- `product` only for decorative-only wording;
- `landing` for marketing claims.

`app/(public)/layout.tsx` currently sends only selected namespaces to client
components. The landing and all stills should remain server-rendered. Do not add
`landing`, `practice`, `trainings` or `stories` to
`PUBLIC_CLIENT_NAMESPACES` merely for this work.

Both locale files must have identical key structure. Run the repository's
existing message/key validation if present; otherwise add a focused unit check
for the new landing keys as described below.

### 8.2 Root metadata

Update these keys in both locales:

```text
meta.title
meta.description
meta.ogTitle
meta.ogDescription
```

Requirements:

- title remains compact and brand-first;
- description mentions personal vocabulary practice, short stories in context
  and grammar without becoming a feature inventory;
- OG title is readable against the unchanged bilingual word-pair image;
- OG description must not claim personalization for anonymous visitors;
- do not change `generateMetadata`, image dimensions, alt text or `/og.png`.

Next.js 16 metadata remains generated in the root Server Component through the
existing `generateMetadata`; no new route metadata API is needed.

## 9. README contract

Update `README.md` in the same pull request.

### 9.1 Introduction

The opening paragraph should describe three connected surfaces:

- personal English-to-Russian vocabulary;
- active practice plus FSRS returns;
- short contextual Stories and grammar courses.

Keep the existing explanation of the shared lexicon as the technical hook.
Stories should be one concise sentence, not a second product essay.

### 9.2 Screens table

Use the live sidebar order and add Stories:

| Where | Required content |
|---|---|
| Trainings | Eight catalog entries, source selection and signed-in home |
| Grammar | current live/coming-soon course description |
| Stories | ten curated A1/A2 stories; dictionary-overlap ordering; contextual glosses; three questions |
| My progress | sidebar, not account menu; current metrics summary |
| My words | current dictionary behavior |
| My sets | tag behavior |

The table should follow Study then Dictionary, matching `NAV_SECTIONS`. Correct
the existing statement that My progress lives in the account menu.

### 9.3 Practice paragraph

Replace “Seven ways to be asked a word” with language that cannot drift from
the eight catalog entries. Either list all eight explicitly or say “The
training catalog covers…”. The preferred README wording distinguishes:

- six direct vocabulary question formats;
- Brainstorm as the new-word ladder;
- irregular-verb forms as its own training.

Do not call all eight “question formats” if Brainstorm is a session mode and
verb forms is a separate corpus workflow.

## 10. File-level implementation map

| File | Change |
|---|---|
| `app/(public)/page.tsx` | Load the marketing story DTO; replace Today with Trainings; update the lifecycle rail; insert Stories; rename Grammar still usage; keep Server Component rendering |
| `components/product-frame.tsx` | Derive shell navigation from `NAV_SECTIONS`; accept `activeHref`; add `TrainingsOverviewStill` and `StoryReaderStill`; rename `CourseScreen`; remove `TodayScreen` and stale copy consumers |
| `lib/stories/marketing.ts` | New validated adapter from real story content to the small decorative DTO |
| `messages/ru.json` | Add Stories marketing copy; update hero, rail, Practice, closing CTA and metadata; remove confirmed-unused stale keys |
| `messages/en.json` | Exact structural counterpart to Russian messages |
| `docs/design-system.md` | Amend section 15.3 with the new block order and drift-resistant still rule |
| `README.md` | Add Stories, correct navigation location and practice taxonomy |
| `tests/unit/stories-marketing.test.ts` | Validate configured marketing story and adapter output |
| `tests/unit/marketing-shell.test.ts` or existing nav test | Assert the decorative shell's source is `NAV_SECTIONS`, not a second navigation constant |
| `tests/e2e/public-auth.spec.ts` or a focused landing spec | Smoke-test localized landing content and absence of stale Today/Courses shell labels |

Do not create a generic marketing CMS, a shared “screen registry” or a new
dependency for this change.

## 11. Testing

### 11.1 Unit tests

Add `tests/unit/stories-marketing.test.ts`:

1. `loadMarketingStoryStill()` returns the configured story title, level and a
   positive estimated duration.
2. The selected paragraph exists and includes the configured annotation.
3. The selected annotation has a non-empty contextual gloss.
4. The returned segments reconstruct the original paragraph exactly.
5. Exactly one segment is marked as the statically open annotation.
6. Invalid configured ids produce `StoryContentError`, exercised through an
   exported pure builder that accepts a config in tests rather than by mutating
   module constants.

Extend the navigation test or extract a tiny pure helper so one test proves the
marketing sidebar produces the same section keys, item keys and href order as
`NAV_SECTIONS`. Avoid snapshotting a large JSX tree.

If there is no locale parity test, add one that recursively compares the key
paths of `messages/ru.json` and `messages/en.json`. This guards all public copy,
not only Stories.

### 11.2 Browser checks

At minimum, in both locales:

- `/` renders the Stories heading and the real configured story title;
- the hero shell contains Study, Trainings, Grammar, Stories, My progress,
  Dictionary, My words and My sets on desktop;
- the hero shell does not contain Today, Tasks or a Courses section label;
- the primary signup link still points to `/register` and sign-in to `/login`;
- at 390px, no horizontal scroll exists and the hidden miniature sidebar does
  not leave empty width;
- at 768px and 1280px, the story gloss card remains inside the frame;
- the page has one `h1`, section headings remain in document order and all
  decorative frames are hidden from the accessibility tree;
- keyboard focus reaches only the real header and CTA controls, never still
  elements.

Run an axe pass on `/`. The added section must introduce no accessible duplicate
story text because the entire still stays `aria-hidden`.

### 11.3 Visual review

Capture Russian and English at 390×844, 768×1024 and 1440×1000. Check:

- hero balance after the six-item sidebar increases frame height;
- heading wrapping in both locales;
- Stories paragraph readability and underline visibility;
- gloss card does not resemble a clickable floating control outside the frame;
- alternating section composition remains clear;
- the extra section does not weaken the final CTA through excessive vertical
  repetition.

### 11.4 Commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Run the focused public Playwright spec after the unit suite. No integration
database suite is required because this work adds no persistence path.

## 12. Performance and accessibility

- Preserve Server Component boundaries. `loadMarketingStoryStill()` is a
  synchronous read of statically imported, validated JSON.
- Add no `use client`, browser fetch, lazy carousel, external font, image or
  animation for Stories.
- The landing's HTML grows by one compact section; keep the preview to one
  paragraph and one gloss rather than rendering a whole story.
- Continue using the existing `aria-hidden` and `pointer-events-none` contract
  on decorative frames. Child pseudo-controls must not receive `tabIndex`,
  button semantics or event handlers.
- Keep learning-language excerpts marked with `lang="en"`. The contextual
  Russian gloss inherits the page locale.
- The underlined surface cannot rely on color alone: preserve the real reader's
  2px underline and offset.
- Respect existing responsive type tokens and `prefers-reduced-motion`; the new
  still is static.

## 13. Rollout and observability

Ship as one pull request because partial rollout would preserve contradictory
public claims. The safe internal order is:

1. add the validated marketing story adapter and tests;
2. make `ProductFrame` derive from live navigation and add the new stills;
3. update landing composition and both locale files;
4. update metadata, README and design-system documentation;
5. run unit, lint, type, build and browser checks.

No feature flag is needed. The route has no mutation or paid-provider path and
rollback is a normal code revert.

After production deploy, verify:

- `/` in a fresh Russian session and after switching to English;
- rendered `<title>`, description, Open Graph and Twitter descriptions;
- no client-console errors or hydration warnings;
- page-level Web Analytics and Speed Insights continue reporting;
- the existing signup and login destinations still work.

Do not add a custom Stories-section analytics event until there is an actual
interaction to measure. Section impressions alone would not guide a product
decision for a one-person project.

## 14. Acceptance criteria

The change is complete only when all of the following are true:

1. The landing has one dedicated Stories section between Practice and Grammar.
2. Its preview is derived from a validated real story and shows a real
   contextual gloss.
3. The hero depicts the current Trainings entry surface, with no fabricated
   learner count.
4. The decorative window renders `NAV_SECTIONS` and highlights by live href.
5. Today, Tasks and the top-level Courses section no longer appear in the
   public mockup.
6. Russian and English hero, lifecycle, Stories, closing and metadata copy
   describe the same product.
7. The Practice count/taxonomy no longer says “seven” while eight catalog
   entries exist.
8. README lists Stories and matches current sidebar order and ownership.
9. Design-system section 15.3 records the new landing order and forbids a
   second hard-coded navigation model in product stills.
10. The landing adds no client boundary, network request, media payload or
    interactive decorative control.
11. Unit, lint, typecheck, build and focused public browser checks pass.
12. Mobile layouts have no horizontal overflow, and decorative content remains
    absent from the accessibility tree.

## 15. Follow-up, deliberately separate

After enough real use exists, decide whether Stories deserves a public deep
link or sample reader. That would require an explicit unauthenticated content
policy, indexing decision and CTA model. It is not necessary to make the
current landing truthful and should not delay this alignment.
