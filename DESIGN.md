# Slova design

Light, calm UI for pasting word lists and studying them. Not a dense dashboard.

## Principles

- Components come from **shadcn/ui**, always. No native `<select>`, `<button>`
  or `<input>` dressed up with utility classes, and no bespoke CSS to imitate a
  component — if the primitive is missing, install it
  (`npx shadcn@latest add <name>`). Hand-written markup is for layout only.
  These are built on **@base-ui/react** (not Radix); `components.json` style is
  `base-nova`.
- Brand first: **Slova** is the hero signal on the landing page; in the app shell it’s the Fraunces wordmark (`BrandWordmark` — teal S, tighter and slightly wonkier than a page title). The wordmark hides when the sidebar collapses.
- One job per screen: home = due; import = add words; study = one card.
- Prefer whitespace and typography over cards/chrome.
- Cards only where the user interacts (study flip surface, list rows).

## App shell

Authenticated pages use shadcn **Sidebar** (Claude-style shell, Slova colors):

- Width **287.5px**; search + collapse sit opposite the Fraunces wordmark (logo hides when collapsed). Search: ⌘K / Ctrl+K.
- Nav items are **text-base** on a **28px** row — the type stays large, the
  padding inside the pill is tight. **4px** gaps sit between the items, so
  the list is not one block. Twelve links plus labels fit an iPad Air (820px)
  without the menu scrolling. Group labels stay the small sage caps. Collapsed
  icon mode keeps the compact 32px target.
- Header and footer are hairlined off the scrolling list (`border-sidebar-border` under the wordmark, above the account). They are flex regions, not overlays, so a line is enough.
- Groups are the four sections of the app — **Tasks**, **Practice**, **Courses**, **Dictionary** — each listing its own pages. The section name is a group label, not a link; the pages inside carry the icons. Order and titles live in `lib/nav.ts`, which is the only place that decides what is active.
- Nav states: `--sidebar-hover` (lighter) vs `--sidebar-active` (slightly darker) — not the same color.
- Footer: avatar + name, dropdown opens **to the right** (below on a phone) with Log out.

## Page width

The shell no longer picks a width — the page does, via `components/page.tsx`:

- `<Page>` — **828.5px** max (`w-full max-w-[828.5px]`). That is the iPad Air
  column beside the 287.5px sidebar, after the shell’s `md:px-8`. Lessons, the
  lesson list, My words, Today — every app screen. A phone is narrower, so it
  shrinks. `<PageWide>` is the same width; the name is leftover.

## Placeholders

A page that isn't built yet uses `ComingSoon` — one component, not a dozen hand-written empty states, so the four sections keep reading as one app. It takes the section name as eyebrow and a short list of what will live there; concrete beats "coming soon". It is built from `PageHeader` + `Section`, so the frame doesn't shift when the page gets real content.

## Page headers

Every app page uses `PageHeader`: optional **eyebrow** + Fraunces **title** + muted **description**. Optional actions on the right.

A nested course page (a lesson, the lesson list, My courses) ends with `PageBack` — a ghost `lg` button, arrow plus label (`Back to lessons`, `Back to courses`). It is not in the header: the title stays the title, and leaving is a choice after the work.

A grammar lesson is two beats. First the rule on a card, and **Start practice** (the one filled button). Then the drill; the rule leaves the page. **Show the rule** (ghost) opens it again in a shadcn Drawer from the right, so the practice column stays one job.

Header actions share **one size** (`lg`). A page has at most one filled button
— the thing you came to do; everything beside it is `ghost`. Destructive
actions are muted until hover (`text-muted-foreground hover:text-destructive`),
never red at rest next to a primary button.

## Sections

Inside a page, every section uses `Section`: soft sage micro-label, optional
count, optional action on the right. There is no second heading size — a bold
`text-lg` heading next to an uppercase micro-label was what made pages read as
two designs stitched together. Sections are separated by `space-y-10`.

## Brand greens (keep both)

| Role | Token / class | Value | Use |
|------|---------------|-------|-----|
| Soft sage | `--brand-soft` / `text-brand-soft` | `#5C8680` | Eyebrows (`TODAY`), sidebar group labels, micro-labels on cards (“Word”), section tags |
| Strong teal | `--primary` / `bg-teal-800` | `#115E59` | Primary CTAs, filled buttons |

Do **not** use strong teal for quiet labels — that kills the calm look. Soft sage is for orientation; strong teal is for actions.

More places for soft sage later: progress hints, “due” chips, empty-state accents, focus rings on secondary controls.

## Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--background` / mist | `#EEF2F4` | Page wash (cool gray, not cream) |
| `--foreground` | `#15202B` | Body text |
| `--brand-soft` | `#5C8680` | Soft green labels (TODAY) |
| `--primary` / teal | `#115E59` | CTAs, accent links |
| `--accent` | `#D7ECE8` | Soft teal wash |
| `--muted-foreground` | `#5B6B78` | Secondary copy |
| `--border` | `#D5DEE6` | Hairlines |
| `--radius` | `0.75rem` | Controls and panels |

Use tokens / Tailwind theme classes — do not hardcode new hex in components unless adding a token here first.

## Typography

- **Display:** Fraunces (`font-display`) — brand, study words, section titles
- **UI:** Source Sans 3 (`font-sans`) — body, forms, nav; includes Cyrillic,
  so translations do not fall back to a system serif

## Brand mark

The logo is the word **Slova** (`BrandWordmark`): Fraunces, S in strong teal,
the rest in ink. No tile, no icon beside it. It uses `font-logo` so it does
not read as a heading. The tab icon is that same Fraunces S, outlined as a path so the tab does not
have to load a font (`app/icon.svg`, plus `app/favicon.ico` because Chrome
still asks for that path first) — teal, no tile. The iOS home-screen
icon is the S on a teal field (`app/apple-icon.tsx`) because a home-screen
glyph still needs a fill, and iOS applies its own mask.

## Motion

- Study card enter: `rise-in` ~320ms
- Soft background blurs on landing for atmosphere
- Prefer opacity/transform; no glow stacks

## Progress on Today

One line under the Home header, soft sage, same micro-label treatment as the
eyebrow: `12 REVIEWED TODAY · 5-DAY STREAK`. It is hidden entirely before the
first review — a zero streak is discouraging, not informative. A day not yet
studied keeps the streak visible rather than resetting it at midnight. No
charts, no tiles; the dense stats dashboard stays out of scope.

Under it, **Your words**: one stacked proportion bar (learned / learning / not
started), a legend, and the share of translations that came from the shared
base. The bar is the only picture on the screen, because three proportions are
easier to see than to read.

The page ends with its two actions — **Study now** and **Add words** — in the
flow of the content, not in `PageHeader.actions`. A header action needs a
header wide enough to hold it; here it left the buttons stranded in empty
space beside a narrow title. **Study now** opens the trainings list rather than
a session: choosing the format is part of studying now that there are seven.

## Study session

One card, two answers, no chrome above it. Below the answer buttons sits a
quiet row: **Undo** on the left (ghost, disabled until something was rated),
the shortcut hint on the right (hidden on small screens, where there is no
keyboard). Shortcuts: **Space** flips, **1** again, **2** know it, **Z**
undo. Rating keys only work once the card is flipped — the answer should be
seen before it is judged.

## Dictionary — add and list on one screen

One direction only: **English word, Russian translation opposite it.** There is
no language picker — the columns are labelled English / Russian and the page
carries no choice the user has to make twice.

`/dictionary` is the whole of it. Adding words is not its own screen any more:
the box sits on top of the list it fills, so a word added is visible the moment
it is added, and `/dictionary/add` redirects here (`next.config.ts`) for links
that were made before the screen went away.

Both tables sit on `bg-card` (white) against the mist page wash — a table is a
surface you work on, and it should read as one.

1. **A table with one empty row.** Type in it and another appears underneath,
   so it grows the way a list does. A multi-line paste expands into a row each.
2. **The second column is yours to fill, or to leave.** Typing and waiting are
   separate states: nothing is translated while someone is still adding rows.
   An earlier version translated as you typed and it read as a hang — every row
   said "translating…" at the exact moment the person wanted to look at what
   they had written, and it spent budget on rows about to be deleted.
3. Under the table, the **set picker** — an existing set, a new one named there,
   or none. "No set" is a real answer: a word belongs to the dictionary, and
   sets are tags on top of it.
4. **Add words** does everything, in one order: translate the blanks, then save.
   Rows fill in as the answers arrive — the shared base answers for the whole
   list at once, the model streams the rest. A machine-filled cell is muted
   until it is touched, because it is a suggestion.
5. Under everything, **All words**: ten a page by default, paged in the
   database, columns English / Russian / Set / Learned. Pages on the left —
   shadcn `Pagination` with numbered links and an ellipsis — the page size
   (10 / 25 / 50) on the right. One control for where you are, one for how
   much you see.

While the list is reloading it **dims in place** rather than turning into
skeletons. Swapping ten rows for ten grey bars is the same information and a
jump; the rows stay where the cursor left them.

Rows tick, and the actions appear as a floating pill at the bottom of the
screen rather than taking the place of the filters — a bar that pushes the
table down moves it out from under the cursor at the exact moment a tick
goes in. Filters stay where they were.

Filing is two verbs, because a word can belong to several lists: **Also add**
(join this set, keep the rest), **Take out** (leave this set, stay in the
rest). The picker can name a **new set** as well as pick an existing one —
the same choice as when adding words. **Also add** then creates the deck and
files the ticked rows into it, which is how words that arrived with no set
get one later. **Take out** stays on sets that already exist. Deleting asks first, in a shadcn `AlertDialog` — it is the one action nothing
undoes, and `confirm()` looked like the browser talking rather than the app.
Nothing else asks: a dialog in front of a reversible action teaches people to
dismiss dialogs. A tick you cannot see is a tick you did not mean, so changing page,
filter or sort clears the selection.

**Learned** is five dots in soft sage, not a number or a bar: the scale has five
steps and no units, and a table row is read at a glance. It is derived from the
schedule rather than stored — see `lib/word-rating.ts`.

Everything a person types also goes to the shared base as a *candidate*, so the
next list that contains the word need not be translated again — but a typed
translation stays private until a second independent source agrees with it.

## Word tables

Two surfaces, and they are deliberately not the same component.

**The set page** keeps `WordTable` — one container, one `English | Russian |
actions` grid (`WORD_GRID`), one header. Translations sit in their own column
rather than pushed to the right edge; the whole point is reading a pair across.

**The dictionary list** is a real table (shadcn `Table`) because it is a grid of
records with four columns and pages, not a list of pairs.

Rows stay quiet in both. Edit and delete are **ghost icon buttons** that fade in
on hover (and on focus, for keyboard) — on touch widths they stay visible, since
there is no hover there. Editing swaps the two cells for inputs without changing
the row height: save and cancel are icon buttons in the actions column, Enter
saves, Escape cancels. No modal, no per-row toolbar.

The destructive action differs by surface, and the icon says which:

- on a **set** page it is a minus — the word leaves the set and nothing else.
  No confirmation: nothing is lost, and it goes back with one click.
- in the **dictionary** it is a bin — the word goes, and its progress with it.
  That one asks first.

## Practice

Every training is the same screen with a different question in it. The prompt
is Fraunces and large; the answer area is whatever that format needs.

**The whole of it works from the keyboard**, because a drill you can only do
with a mouse is a drill people stop doing:

- multiple choice — options are numbered **1–4**, and those keys pick them;
- word builder — typing a letter claims the leftmost tile bearing it,
  **Backspace** hands the last one back;
- typed formats — **Enter** submits, and **Enter** again moves on.

**Every training asks where its words come from** before the first question —
Brainstorm included. Once there is more than one list, "practise" stops being
one thing: learning medical vocabulary and revising phrasal verbs are different
sittings, and a trainer that decides for you turns the sets into decoration.
Several can be chosen at once, and choosing none means everything. Someone with
no sets never sees the step at all, because it would be a question with one
answer.

**An answered question stays on screen.** The verdict appears under it — a
green tick, or a red cross with the right answer — and the button becomes
Next. Swapping the question for a panel that says "Correct" removed the answer
at the exact moment it was worth looking at: seeing which option was right,
beside the one you picked, is where the learning happens. A right answer says
almost nothing; it is a wrong one that needs words.

**Brainstorm opens with the words**, all six in one table with their
translations and a Start button. An introduction buried inside the drill reads
as a question you cannot answer. Six is the number the table can be taken in at
a glance.

It shows **words left in the session, never a percentage.** A percentage in a
drill-to-mastery loop becomes a number to be pushed to 100, and people start
guessing to move it.

**Sound is the browser's own voice.** It can refuse — a page may not speak
before it is clicked, and iOS refuses every time — so an audio question that
gets no sound says to press Play, and if that fails too it shows the word.
A listening exercise with neither sound nor text is a dead end, not a hard
question.

## Out of scope (for now)

Dark theme, mascot, dense stats dashboards.
