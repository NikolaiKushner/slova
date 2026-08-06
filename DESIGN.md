# Slova design

Light, calm UI for pasting word lists and studying them. Not a dense dashboard.

## Principles

- Brand first: **Slova** is the hero signal on the landing page.
- One job per screen: home = due + paste; import = paste; study = one card.
- Prefer whitespace and typography over cards/chrome.
- Cards only where the user interacts (study flip surface, list rows).

## Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--background` / mist | `#EEF2F4` | Page wash (cool gray, not cream) |
| `--foreground` | `#15202B` | Body text |
| `--primary` / teal | `#115E59` | CTAs, accent links |
| `--accent` | `#D7ECE8` | Soft teal wash |
| `--muted-foreground` | `#5B6B78` | Secondary copy |
| `--border` | `#D5DEE6` | Hairlines |
| `--radius` | `0.75rem` | Controls and panels |

Use Tailwind semantic classes (`bg-background`, `text-primary`, `bg-teal-800` for strong CTAs) — do not hardcode new hex in components unless adding a token here first.

## Typography

- **Display:** Fraunces (`font-display`) — brand, study words, section titles
- **UI:** DM Sans (`font-sans`) — body, forms, nav

## Motion

- Study card enter: `rise-in` ~320ms
- Soft background blurs on landing for atmosphere
- Prefer opacity/transform; no glow stacks

## Out of scope (for now)

Dark theme, mascot, dense stats dashboards.
