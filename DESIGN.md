# Slova design

Light, calm UI for pasting word lists and studying them. Not a dense dashboard.

## Principles

- Components come from **shadcn/ui**, always. No native `<select>`, `<button>`
  or `<input>` dressed up with utility classes, and no bespoke CSS to imitate a
  component — if the primitive is missing, install it
  (`npx shadcn@latest add <name>`). Hand-written markup is for layout only.
  These are built on **@base-ui/react** (not Radix); `components.json` style is
  `base-nova`.
- Brand first: **Slova** is the hero signal on the landing page; in the app shell it’s the sidebar wordmark (Fraunces).
- One job per screen: home = due; import = add words; study = one card.
- Prefer whitespace and typography over cards/chrome.
- Cards only where the user interacts (study flip surface, list rows).

## App shell

Authenticated pages use shadcn **Sidebar** (Claude-style shell, Slova colors):

- Width **287.5px**; search + collapse sit opposite the Fraunces wordmark (logo hides when collapsed). Search: ⌘K / Ctrl+K.
- Groups are the four sections of the app — **Tasks**, **Practice**, **Courses**, **Dictionary** — each listing its own pages. The section name is a group label, not a link; the pages inside carry the icons. Order and titles live in `lib/nav.ts`, which is the only place that decides what is active.
- Nav states: `--sidebar-hover` (lighter) vs `--sidebar-active` (slightly darker) — not the same color.
- Footer: avatar + name, dropdown opens **up** with Log out.

## Page width

The shell no longer picks a width — the page does, via `components/page.tsx`:

- `<Page>` — `max-w-2xl`. The default, and what every reading screen uses.
- `<PageWide>` — `max-w-5xl`. Table-shaped screens only (the dictionary list). Reach for it when a screen is a grid of records, not a thing to read.

## Placeholders

A page that isn't built yet uses `ComingSoon` — one component, not a dozen hand-written empty states, so the four sections keep reading as one app. It takes the section name as eyebrow and a short list of what will live there; concrete beats "coming soon". It is built from `PageHeader` + `Section`, so the frame doesn't shift when the page gets real content.

## Page headers

Every app page uses `PageHeader`: optional **eyebrow** + Fraunces **title** + muted **description**. Optional actions on the right.

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
- **UI:** DM Sans (`font-sans`) — body, forms, nav

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
it is added, and `/dictionary/add` redirects here.

1. **One field**, full width. Type a word and press Enter for one row; paste a
   list and get one row per line. Same field, two behaviours by size of input —
   picking a mode first would be describing what you are about to do before
   doing it.
2. **Translations arrive on their own**: instantly for anything the shared base
   knows, then row by row as the model answers the rest. Each stays editable —
   machine output is a draft, and nothing is saved until the button.
3. The draft table shows **ten rows** and scrolls past that, rather than pushing
   the set picker and the button off the screen.
4. Under it, the **set picker** — an existing set, a new one named there, or
   none. "No set" is a real answer: a word belongs to the dictionary, and sets
   are tags on top of it.
5. Under everything, **All words**: 25 a page, paged in the database, columns
   English / Russian / Set / Learned.

**Learned** is five dots in soft sage, not a number or a bar: the scale has five
steps and no units, and a table row is read at a glance. It is derived from the
schedule rather than stored — see `lib/word-rating.ts`.

Avoid stacked "group inputs" for long lists — the table scales better. Avoid a
raw textarea now that translations arrive automatically: there would be nowhere
to correct machine output.

## Word tables

Saved words and import rows are the **same object**, so they share `WordTable`:
one container, one `English | Russian | actions` grid (`WORD_GRID`), one header.
Translations sit in their own column rather than pushed to the right edge — the
whole point is reading a pair across.

Rows stay quiet. Edit and delete are **ghost icon buttons** that fade in on
hover (and on focus, for keyboard) — on touch widths they stay visible, since
there is no hover there. Editing swaps the two cells for inputs without
changing the row height: save and cancel are icon buttons in the actions
column, Enter saves, Escape cancels. No modal, no per-row toolbar.

## Out of scope (for now)

Dark theme, mascot, dense stats dashboards.
