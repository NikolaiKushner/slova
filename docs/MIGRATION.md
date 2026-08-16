# Slova — interface rebuild

Companion to `design-system.md`. The rebuild landed on `landing-redesign` in
August 2026, one commit per step. This file is the record: the rules that
still apply, the screen checklist, and the product backlog that was never
part of the visual work.

**Owner decision, August 2026:** migration ran as one commit per step on
`landing-redesign`, not a branch and PR per step. `main` auto-deploys, so the
branch accumulated the batch. The rule “the app stays working after every
step” was not relaxed.

---

## Rules that still apply

1. **Tokens and layout do not travel in the same commit.** Otherwise a break
   has no cause.
2. **Relayout and behaviour change are different jobs.** “Drop the second
   set-picker screen” is a product decision — see the backlog, not a
   migration step.
3. **The spec outranks habit.** If the code was otherwise — rewrite the code.
4. **No new hardcoded colours.** Semantic classes only.
5. **Check every screen at four widths:** 768, 834, 1024, 1194.
6. **Practice screens pass the question “can you see the answer?”**
7. The app stays working after every step.

---

## Prep — done

In the repo:

```
docs/
  design-system.md      ← specification
  MIGRATION.md          ← this file
  tokens.html           ← visual cheat sheet
  globals.reference.css ← token reference from §19.1
```

`globals.reference.css` sits beside the working file so `app/globals.css` has
something to diff against. Every divergence in the working file is marked
“Deviation” and explained.

The old `DESIGN.md` was deleted. Two sources of truth for the visual layer is
no source of truth. It remains in git history.

`CLAUDE.md` points agents at `docs/design-system.md` before any UI change.

---

## Steps

| Step | What | Status |
|---|---|---|
| 0 · Hydration | Overlay was Urban VPN, not our markup | **done** — no code |
| 1 · Foundation | Literata, Inter, `globals.css` | **done** |
| 2 · Primitives | shadcn to spec; disabled primary is grey | **done** |
| 3 · Shells | `AppShell`, `FocusShell`, sidebar; `100dvh` | **done** |
| 4 · Training kit | `OptionButton` and the rest; `/dev/kit` | **done** |
| 5.1 · Question screen | Seven formats on `FocusShell` | **done** |
| 5.2 · Brainstorm | Same question screen + `StageRail` | **done** |
| 5.3 · My words | Dense list, add panel | **done** |
| 5.4 · Trainings hub | Source bar on the same page | **done** |
| 5.5 · Courses / lesson | Practice uses the same `OptionButton` | **done** |
| 5.6 · Auth | Login and register share `AuthNarrow` | **done** |
| 5.7 · Legal | Column, measure, updated date | **done** |
| 5.8 · Landing | Tokens, bilingual, mockups | **done** |

The temporary token bridge (`brand-soft`, `correct`/`wrong`, `font-heading`)
was removed after the screens moved. `PageHeader` is `Eyebrow` + `text-h1` +
`text-lead`.

**Step 0 note.** Hydration overlays on Privacy / Terms / auth were
[Urban VPN Proxy](https://chromewebstore.google.com) injecting
`bis_skin_checked`. Eighteen routes in a clean Chrome profile: zero errors.
`suppressHydrationWarning` on `<html>` and `<body>` stays for extensions and
password managers. A hydration error after a later change is ours — check in
a browser without extensions first.

---

## Screen checklist

Same for every screen. Still the bar for a visual change.

- [ ] No hex outside `globals.css`; colours only via semantic classes
- [ ] Type sizes from the §3 scale, no one-offs
- [ ] Every state from §10, including `disabled` and `focus-visible`
- [ ] Empty, loading (`Skeleton`, not a spinner), and error-with-action
- [ ] Keyboard: tab order matches the visual order
- [ ] Touch targets ≥44×44, inputs ≥16px
- [ ] Row actions visible on touch without hover
- [ ] Checked at 768 / 834 / 1024 / 1194
- [ ] Copy per §17: lowercase «вы», ё, guillemets, em dash, `8 172` with a
      thin non-breaking space
- [ ] **Practice screens:** the answer is not visible — not in progress, not
      in tooltips, not in `title`, not in `aria-label`, not in the tab title
- [ ] Nothing jumps when a state changes (verdict, format change)

---

## Guardrails

Cheap checks that catch a regression without a review. Not wired into CI yet.

**1. Hardcoded colour.**

```bash
# forbid hex outside globals.css and tokens
! grep -rnE '#[0-9a-fA-F]{6}\b' --include='*.tsx' --include='*.ts' app components \
  | grep -v 'globals.css'
```

Expected leftovers: OG image, auth email HTML, Google icon, `themeColor`.

**2. Small inputs.** Catches the iPad zoom:

```bash
! grep -rnE 'text-(xs|sm)\b[^"]*"' --include='*.tsx' app components \
  | grep -E '<(input|textarea|Input|Textarea)'
```

---

## Separate backlog: product decisions

Not part of the rebuild. Each item is its own discussion.

| Decision | What | Status |
|---|---|---|
| ~~Drop the set-picker screen~~ | Source moved to a bar at the top of Trainings | **done**, August 2026 |
| ~~Filters by word state~~ | Due / new / hard / all dictionary — in the source panel, with sets | **done**, August 2026 |
| ~~Russian landing~~ | Audience is Russian-speaking; landing is bilingual | **done**, August 2026 |
| Words with no set | Allow; “No set” is an ordinary row with a count; the dropdown remembers the last set | proposed |
| Sets → tags | A word can be in several; “no tag” stops being a special case | think — changes the data model |
| Course lesson order | Free or sequential — this decides how progress and “Continue” look | **needs a decision** |
| Brainstorm rung drop | A miss currently sends you back a rung; risk of looping on a hard word. Options: not below rung two; after three misses show and advance | **needs a decision** |
| Auto-advance after a correct answer | ~1.2 s on correct, wait on a miss. Faster in flow, takes away control | think |
| User rights in the policy | Access, export the dictionary, region | **legally desirable** — copy is in; export is still email |
| Dark theme | Tokens are ready, no layout | after the rebuild |

---

## What the agent prompts were

Steps 1–5 were executed from the prompts originally in this file, one commit
each. They are not repeated here: the code is the record, and
`docs/design-system.md` is the spec those prompts pointed at.
