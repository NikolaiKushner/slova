# Slova design

Light, calm UI for pasting word lists and studying them. Not a dense dashboard.

## Principles

- Brand first: **Slova** is the hero signal on the landing page; in the app shell it’s the sidebar wordmark (Fraunces).
- One job per screen: home = due; import = add words; study = one card.
- Prefer whitespace and typography over cards/chrome.
- Cards only where the user interacts (study flip surface, list rows).

## App shell

Authenticated pages use shadcn **Sidebar** (Claude-style shell, Slova colors):

- Width **287.5px**; search + collapse sit opposite the Fraunces wordmark (logo hides when collapsed). Search: ⌘K / Ctrl+K.
- Groups: **Learn** (Today, Study, Lists) and **Tools** (Add words — more later).
- Nav states: `--sidebar-hover` (lighter) vs `--sidebar-active` (slightly darker) — not the same color.
- Footer: avatar + name, dropdown opens **up** with Log out.
- Main column stays narrow (`max-w-2xl`).

## Page headers

Every app page uses `PageHeader`: optional **eyebrow** + Fraunces **title** + muted **description**. Optional actions on the right.

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

## Import / add words

Hybrid flow (not a dense spreadsheet app):

1. Optional **paste** seeds the table (pairs or single words).
2. Editable **Word | Translation** table with a trailing empty row that grows as you type.
3. **Translate empty** fills blanks via the server (MyMemory); per-row **Fill** for one word.
4. User reviews, then imports only complete rows.

Avoid stacked “group inputs” for long lists — the table scales better. Avoid raw textarea-only once auto-translate exists (no place to edit machine output).

## Out of scope (for now)

Dark theme, mascot, dense stats dashboards.
