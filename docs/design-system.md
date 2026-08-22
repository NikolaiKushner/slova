# Slova — design system and interface specification

**Version 1.0 · August 2026**
Stack: Next.js (App Router) · Tailwind CSS v4 · shadcn/ui · lucide-react

This document is the single source of truth for the visual layer. Everything not described here is derived from the principles in §1. If the implementation and the document diverge — the document is right.

---

## Contents

1. [Principles](#1-principles)
2. [Fonts](#2-fonts)
3. [Typographic scale](#3-typographic-scale)
4. [Color: primitives](#4-color-primitives)
5. [Color: semantic tokens](#5-color-semantic-tokens)
6. [Radii, borders, shadows](#6-radii-borders-shadows)
7. [Spacing and rhythm](#7-spacing-and-rhythm)
8. [Grid, containers, breakpoints](#8-grid-containers-breakpoints)
9. [iPad and touch input](#9-ipad-and-touch-input)
10. [States](#10-states)
11. [Motion](#11-motion)
12. [Icons](#12-icons)
13. [shadcn components: mapping](#13-shadcn-components-mapping)
14. [Custom components](#14-custom-components)
15. [Screen specifications](#15-screen-specifications)
16. [Empty states, loading, errors](#16-empty-states-loading-errors)
17. [Text and tone](#17-text-and-tone)
18. [Accessibility](#18-accessibility)
19. [Implementation](#19-implementation)
20. [What not to do](#20-what-not-to-do)

---

## 1. Principles

1. **Quiet editorial style.** Serif headings, lots of air, one muted green accent, no decoration. The product is about words — typography is the design.
2. **No photographs.** Neither stock photos nor character illustrations. Meaningful graphics — only typography, light grain, and SVG icons.
3. **Density grows inward.** The landing is spacious, the vocabulary is dense, practice is focused. Three density modes, not one.
4. **The screen must not jump.** Within a single scenario (practice, lesson) zones have a fixed height: changing a task changes the content, not the geometry.
5. **Progress is always visible and always moves.** Any counter that does not change after a user action is a design error.
6. **One thing — one look.** The same kind of screen (a question with options) looks the same everywhere: in practice, in brainstorm, in a grammar lesson.
7. **The keyboard is a full input method.** Any practice session can be completed without a mouse. Key hints are visible.
8. **Russian is the interface language.** English remains only inside the learning material.

---

## 2. Fonts

Two typefaces. Both variable, both with full Cyrillic, both available on Google Fonts and self-hosted via `next/font/google`. There is no third typeface: language tokens use the system monospace (zero load cost).

### 2.1 Literata — display, serif

Headings, words in practice, large numbers, lesson and course titles.

| | |
|---|---|
| Source | Google Fonts, variable |
| Axes | `opsz` 7–72, `wght` 200–900 |
| Subsets | latin, latin-ext, **cyrillic**, cyrillic-ext, greek, vietnamese |
| Weights used | 400 (regular), 500 (medium), 600 (semibold — logo only) |
| Italic | available, as separate files; not used in the interface |

**Why.** Literata was made for long on-screen reading: moderate stroke contrast, large x-height, calm serifs. It has honest Cyrillic from TypeTogether, not automatically filled in — important, because half of the product's headings are in Russian. The optical-size axis lets one typeface cover both a `44px` word in practice and an `18px` lesson title in a list: at large sizes `opsz` thins the strokes, at small ones it strengthens them.

**`opsz` setup:** bind to the size.
- ≤ 16px → `opsz: 14`
- 17–24px → `opsz: 20`
- 25–36px → `opsz: 32`
- ≥ 37px → `opsz: 48`

### 2.2 Inter — interface, sans

All remaining text: paragraphs, controls, tables, captions, navigation.

| | |
|---|---|
| Source | Google Fonts, variable |
| Axes | `wght` 100–900, `opsz` 14–32 |
| Subsets | latin, latin-ext, **cyrillic**, cyrillic-ext, greek, vietnamese |
| Weights used | 400, 500, 600 |
| Required features | `cv11` (unambiguous `1`), `ss01`, `tnum` in numeric columns |

**Why.** Inter is the default font in shadcn/ui, meaning all components are already drawn and tested in it. Cyrillic is complete and high-quality. Inter's neutrality is a virtue: it does not compete with Literata, it recedes into the background.

### 2.3 Monospace — system stack

Word forms in grammar lessons (`work → works`), letters in «собрать слово», technical values.

```
ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace
```

A web font is not loaded. Cyrillic is not needed here — only Latin and symbols.

### 2.4 Setup

```ts
// app/fonts.ts
import { Literata, Inter } from 'next/font/google'

export const literata = Literata({
  subsets: ['latin', 'cyrillic'],
  axes: ['opsz'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-display',
})

export const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-sans',
})
```

```tsx
// app/layout.tsx
<html lang="ru" className={`${literata.variable} ${inter.variable}`}>
  <body className="font-sans antialiased">…</body>
</html>
```

**Required:** `-webkit-font-smoothing: antialiased` on `body`, do not set `text-rendering: optimizeLegibility` (breaks kerning in Safari on iPad).

---

## 3. Typographic scale

The document's base size is `16px`. All sizes in `rem`. Three steps: desktop (`≥1025px`), tablet (`641–1024px`), phone (`≤640px`).

| Token | Typeface | Weight | Desktop | Tablet | Phone | Line-height | Tracking | Where |
|---|---|---|---|---|---|---|---|---|
| `display` | Literata | 500 | 44 | 40 | 34 | 1.05 | −0.015em | Landing heading, word in practice |
| `h1` | Literata | 500 | 36 | 32 | 28 | 1.10 | −0.015em | Page heading |
| `h2` | Literata | 500 | 28 | 26 | 24 | 1.15 | −0.010em | Section heading, course title |
| `h3` | Literata | 500 | 22 | 21 | 20 | 1.20 | −0.005em | Card heading, lesson title |
| `h4` | Literata | 500 | 18 | 18 | 17 | 1.30 | 0 | List row (word, lesson) |
| `lead` | Inter | 400 | 18 | 18 | 17 | 1.55 | 0 | Subtitle under h1 |
| `story` | Literata | 400 | 18 | 18 | 17 | 1.70 | 0 | Story paragraphs — the only continuous reading surface |
| `body` | Inter | 400 | 16 | 16 | 16 | 1.60 | 0 | Body text, answer options |
| `body-sm` | Inter | 400 | 15 | 15 | 15 | 1.50 | 0 | Dense lists, table cells, navigation |
| `caption` | Inter | 400 | 13 | 13 | 13 | 1.45 | 0 | Captions, metadata, key hints |
| `overline` | Inter | 600 | 11 | 11 | 11 | 1.30 | +0.14em | Overlines: `ПРАКТИКА`, `СЛОВАРЬ` — uppercase via CSS |
| `token` | mono | 500 | 14 | 14 | 14 | 1.40 | 0 | `work → works`, letters |
| `numeral` | Literata | 500 | 34 | 30 | 28 | 1.00 | −0.010em | Large numbers: «8 172», «6 выучено» |

### Rules

- **Never write text in caps in the markup.** `overline` gets `text-transform: uppercase` from CSS — otherwise copying breaks and the screen reader reads letter by letter.
- **Maximum line length — 70 characters** (`max-w-[68ch]`). For legal pages and grammar rules — strictly.
- Numbers in columns and counters — `font-variant-numeric: tabular-nums`.
- A heading and its subtitle are separated by `6–10px`, no more.
- The app page `h1` always comes after `overline`, spacing between them `10px`.

---

## 4. Color: primitives

All values are calculated in OKLCh: within the scale the lightness step is uniform, so transitions are even and contrast is predictable. Hex — for designers, `oklch()` — for code.

### 4.1 Neutral scale (H 165 — cool gray with a green undertone)

| Token | Hex | OKLCh | Purpose |
|---|---|---|---|
| `neutral-0` | `#FFFFFF` | `oklch(100% 0 165)` | Cards, inputs, tables |
| `neutral-25` | `#FBFCFB` | `oklch(99% 0.002 165)` | Sidebar, sticky panels |
| `neutral-50` | `#F5F8F6` | `oklch(97.6% 0.003 165)` | Table headers, backgrounds inside cards |
| `neutral-100` | `#F1F3F2` | `oklch(96.2% 0.003 165)` | **Application background** |
| `neutral-150` | `#EAEDEC` | `oklch(94.4% 0.004 165)` | Row hover, active menu item |
| `neutral-200` | `#E3E7E5` | `oklch(92.4% 0.005 165)` | **Default border** |
| `neutral-300` | `#D2D7D5` | `oklch(87.5% 0.006 165)` | Control borders, checkbox at rest |
| `neutral-400` | `#B3B9B6` | `oklch(78% 0.008 165)` | Disabled icons, decorative dividers |
| `neutral-500` | `#8D9491` | `oklch(66% 0.010 165)` | Placeholders, disabled text |
| `neutral-600` | `#646B67` | `oklch(52% 0.010 165)` | **Muted text** (minimum allowed for captions) |
| `neutral-700` | `#4E5451` | `oklch(44% 0.010 165)` | **Secondary text**, paragraphs |
| `neutral-800` | `#343B38` | `oklch(34.5% 0.012 165)` | Avatar, dark plates |
| `neutral-900` | `#1A1F1D` | `oklch(23.4% 0.008 165)` | **Primary text** |

### 4.2 Green scale (H 172 — brand)

| Token | Hex | OKLCh | Purpose |
|---|---|---|---|
| `green-50` | `#EFF8F5` | `oklch(97.2% 0.010 172)` | Barely noticeable background |
| `green-100` | `#DAEDE6` | `oklch(93% 0.022 172)` | **Mint plate**: badges, icons, selected option |
| `green-200` | `#C1DFD5` | `oklch(88% 0.035 172)` | Mint plate border |
| `green-300` | `#9FC8BA` | `oklch(80% 0.048 172)` | Accent on a dark background |
| `green-400` | `#7DAC9C` | `oklch(70.5% 0.055 172)` | **Focus ring**, border hover, «в работе» |
| `green-500` | `#4F8776` | `oklch(58% 0.066 172)` | Second row of charts |
| `green-600` | `#2C6C5A` | `oklch(48.5% 0.072 172)` | Overlines, links, icons on light |
| `green-700` | `#115645` | `oklch(40.7% 0.072 172)` | **Primary button**, filled progress |
| `green-800` | `#033F32` | `oklch(33% 0.062 172)` | Primary button hover |
| `green-900` | `#032B21` | `oklch(26% 0.048 172)` | **Dark bar** of CTA and footer |
| `green-950` | `#011B14` | `oklch(20% 0.038 172)` | Dark theme, deep background |

### 4.3 Utility

| Role | 50 (background) | 200 (border) | 600 (text/icon) |
|---|---|---|---|
| Success / correct | `#E5F5EA` | `#C1E1CB` | `#3C7753` |
| Error / incorrect | `#FBE8E5` | `#EDC6C1` | `#A14B44` |
| Attention / frequent mistakes | `#FDF0DE` | `#F2D8B5` | `#85612B` |

> **Important:** brand green and “correct” green are different hues on purpose. Brand is blue-green (H 172), success is grassy (H 155). Otherwise “correct” blends with a regular button.

### 4.4 Overlays and effects

| Token | Value |
|---|---|
| `overlay` | `rgba(26, 31, 29, 0.42)` — dialog backdrop |
| `scrim-panel` | `rgba(251, 252, 251, 0.82)` + `backdrop-blur(8px)` — sticky panels |
| `grain` | SVG `feTurbulence`, `baseFrequency 0.8`, `opacity 0.045`, `fixed`, `pointer-events: none` |
| `top-accent` | `linear-gradient(90deg, #F3E4EA 0%, #EFE6F0 40%, #E9EEEE 100%)`, height `3px`, only full width at the top |

---

## 5. Color: semantic tokens

This is what the code operates with. Components never address primitives directly.

### 5.1 Light theme (default)

| Semantic token | Primitive | Comment |
|---|---|---|
| `background` | `neutral-100` | Application and page background |
| `foreground` | `neutral-900` | Primary text |
| `card` / `popover` | `neutral-0` | Cards, popovers, dialogs |
| `card-foreground` | `neutral-900` | |
| `muted` | `neutral-50` | Background inside a card, table header |
| `muted-foreground` | `neutral-600` | Muted text |
| `secondary` | `neutral-150` | Secondary fills, active menu item |
| `secondary-foreground` | `neutral-900` | |
| `primary` | `green-700` | Primary button, filled progress |
| `primary-foreground` | `neutral-0` | |
| `primary-hover` | `green-800` | |
| `accent` | `green-100` | Mint plates, selected option |
| `accent-foreground` | `green-700` | |
| `border` | `neutral-200` | Default borders |
| `border-subtle` | `neutral-150` | Dividers inside cards and lists |
| `input` | `neutral-300` | Input field borders |
| `ring` | `green-400` | Focus |
| `destructive` | `danger-600` | |
| `destructive-foreground` | `neutral-0` | |
| `success` / `success-bg` / `success-border` | `#3C7753` / `#E5F5EA` / `#C1E1CB` | |
| `warning` / `warning-bg` / `warning-border` | `#85612B` / `#FDF0DE` / `#F2D8B5` | |
| `sidebar` | `neutral-25` | |
| `sidebar-border` | `neutral-200` | |
| `sidebar-accent` | `neutral-150` | Active item |
| `sidebar-accent-foreground` | `neutral-900` | |
| `eyebrow` | `green-600` | Overlines |
| `inverse-surface` | `green-900` | Dark bar |
| `inverse-foreground` | `neutral-0` | |
| `inverse-muted` | `green-300` | Secondary text on dark |

### 5.2 Dark theme

Not required for the first release, but the tokens are defined so we don't have to redo them.

| Token | Hex |
|---|---|
| `background` | `#0E1110` |
| `card` / `popover` | `#161918` |
| `muted` | `#1F2321` |
| `border` | `#2D322F` |
| `input` | `#3F4441` |
| `foreground` | `#E2E5E4` |
| `muted-foreground` | `#8D9491` |
| `primary` | `green-600` `#2C6C5A` |
| `primary-foreground` | `#FFFFFF` |
| `accent` | `green-900` `#032B21` |
| `accent-foreground` | `green-300` `#9FC8BA` |
| `ring` | `green-400` |

Verified: `foreground/background` 14.97 · `muted-foreground/background` 6.13 · `white/primary` 6.18.

### 5.3 Data colors (progress, charts)

| Value | Color |
|---|---|
| Learned | `green-700` `#115645` |
| In progress | `green-400` `#7DAC9C` |
| Not started | `neutral-200` `#E3E7E5` |
| Progress track | `neutral-200` |
| Incorrect | `danger-600` `#A14B44` |

`/progress` uses compact metric tiles for atomic values, shadcn Chart **bars** (words practised over 28 days), and dictionary **segments**. Pie, donut and RadialBar are forbidden — including the 485/1500 ring from mockups. `--chart-1`…`--chart-3` in `globals.css` alias onto learned / learning / untouched so the CLI rainbow never reaches the screen. Metric tiles are allowed on this screen only; they do not become a product-wide dashboard pattern.

---

## 6. Radii, borders, shadows

### Radii

Base variable `--radius: 10px`, the rest is derived (shadcn convention).

| Token | Value | Where |
|---|---|---|
| `radius-xs` | 4px | Option number, small badges |
| `radius-sm` | 6px | Icon buttons, checkbox, labels |
| `radius-md` | 8px | Buttons, inputs, selects |
| `radius-lg` | 10px | Cards, answer options, list rows |
| `radius-xl` | 12px | Large cards, mockups, dialogs |
| `radius-2xl` | 16px | Promo blocks |
| `radius-full` | 9999px | Chips, avatars, round sound button, progress tracks |

### Borders

Always `1px`. Thicker — never, except focus and input underline.

| Role | Color |
|---|---|
| Card, panel | `border` `#E3E7E5` |
| Divider inside a card/list | `border-subtle` `#EAEDEC` |
| Input field | `input` `#D2D7D5` |
| Interactive element hover | `green-400` `#7DAC9C` |
| Selected / correct | `green-200` / `success-border` |

### Shadows

Shadows are cool, with a green undertone of the base color `20 32 29`.

| Token | Value | Where |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgb(20 32 29 / .04)` | Primary button |
| `shadow-sm` | `0 1px 2px rgb(20 32 29 / .05), 0 1px 3px rgb(20 32 29 / .04)` | Small floating elements |
| `shadow-card` | `0 1px 2px rgb(20 32 29 / .04), 0 14px 32px -26px rgb(20 32 29 / .30)` | Highlighted cards |
| `shadow-lifted` | `0 1px 2px rgb(20 32 29 / .05), 0 18px 42px -22px rgb(20 32 29 / .22)` | Mockups, round sound button |
| `shadow-pop` | `0 1px 2px rgb(20 32 29 / .05), 0 24px 48px -24px rgb(20 32 29 / .35)` | Popovers, dropdown panels |
| `shadow-dialog` | `0 32px 64px -32px rgb(20 32 29 / .45)` | Dialogs, Sheet |

**Rule:** ordinary cards in lists have no shadows — only a border. A shadow means “this layer is above the others”, not “this is a card”.

### Focus

A single focus look across the entire product:

```css
outline: none;
border-color: var(--ring);            /* green-400 */
box-shadow: 0 0 0 3px rgb(125 172 156 / .28);
```

For elements without their own border (links, icon buttons):
```css
outline: 2px solid var(--ring);
outline-offset: 2px;
```

Use `:focus-visible`, not `:focus`.

---

## 7. Spacing and rhythm

The scale is a multiple of 4. Allowed values: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128`. There are no in-betweens.

### Inner padding

| Element | Desktop | Tablet/phone |
|---|---|---|
| Card | 24–28 | 20 |
| List / table row | 12 × 16 | 14 × 16 |
| Answer option | 14 × 16 | 16 × 18 |
| Button md | 10 × 20 | 12 × 20 |
| Input field | 10 × 12 | 12 × 14 |
| Sidebar (container) | 16 × 10 | — |
| Menu item | 8 × 10 | 12 × 12 |

### Vertical rhythm

| Gap | Desktop | Tablet | Phone |
|---|---|---|---|
| Between landing sections | 128 | 96 | 72 |
| Between blocks inside an app page | 40 | 36 | 32 |
| Section heading → content | 14 | 14 | 12 |
| Between list rows | 0 (divider) | 0 | 0 |
| Between cards in a grid | 14 | 14 | 12 |
| Paragraphs | 14 | 14 | 14 |
| Page top padding | 46 | 32 | 28 |
| Page bottom padding | 80 | 64 | 56 |

**Alignment rule:** in two-column blocks, text and illustration align to the **top** line. Vertical centering of columns of different heights is forbidden — that is exactly what gives a sense of randomness.

---

## 8. Grid, containers, breakpoints

### Breakpoints

| Name | Width | Devices |
|---|---|---|
| `sm` | 640 | Phone in landscape |
| `md` | 768 | iPad mini / 9.7″ portrait |
| `lg` | 1024 | iPad 10.9″/11″ landscape, iPad 12.9″ portrait |
| `xl` | 1280 | Laptop |
| `2xl` | 1536 | Large monitor |

iPad widths that must be checked: **768, 810, 834, 1024, 1112, 1194, 1366**.

### Sidebar

| Window width | Behavior |
|---|---|
| ≥ 1280 | Fixed, 268px |
| 1024–1279 | Fixed, 240px |
| < 1024 | Hidden, opens as `Sheet` from the left via a hamburger button; width 300px |

The sidebar is `position: sticky; top: 0; height: 100dvh`. Use `dvh`, not `vh`: on iPad Safari the address bar breaks `vh`.

### Content containers

| Token | Maximum | Where |
|---|---|---|
| `container-prose` | 700px | Lesson rule, legal pages, story reader |
| `container-list` | 780px | My words, lesson list, catalog |
| `container-wide` | 840px | Practice |
| `container-dashboard` | 1040px | Progress compositional grid only |
| `container-focus` | 540px | Question screen in practice |
| `container-marketing` | 1120px | Landing |

The container is centered in the area to the right of the sidebar. Page horizontal padding: `40 / 32 / 20` (desktop / tablet / phone).

### Grids

- Landing, “four features”: 4 columns → 2 (`<900`) → 1 (`<560`).
- Course catalog, «Скоро»: 2 columns → 1 (`<768`).
- Practice modes: 2 columns → 1 (`<900`).
- Question formats, answer options: **always one column**. Two columns with different text lengths make the eye jump.

---

## 9. iPad and touch input

A separate section because this is the main study scenario.

### Target sizes

| Rule | Value |
|---|---|
| Minimum tap area | **44 × 44 pt** |
| Answer option | height ≥ 56px on touch |
| Button md | height ≥ 44px on touch (desktop 40) |
| Icon button | 44 × 44 (visually the icon is 18–20, the rest is a transparent field) |
| Letter in «собрать слово» | 48 × 48 |
| Chips, labels | height ≥ 36, gap between them ≥ 8 |
| Distance between adjacent targets | ≥ 8px |

Implementation: `@media (pointer: coarse)` increases paddings, not fonts.

### Input

- **All `input` and `textarea` — minimum `16px`.** Smaller — Safari on iOS automatically zooms the page on focus. This is not a recommendation, this is a bug-fix.
- `inputmode` and `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"` on English-word input fields — otherwise iPad substitutes its own suggestions and breaks checking.
- In «написать слово» practice do not open the keyboard automatically — focus on tap instead. Autofocus on iPad covers half the screen. Implemented as `useAutoFocus` (`hooks/use-fine-pointer.ts`), which focuses only under `(pointer: fine)`; the `autoFocus` attribute must not come back, it cannot ask where it is firing.
- `enterKeyHint="go"` on an answer field — the return key then says what Enter does, «Go» rather than «return».

### Layout

- **The session frame is sized *and positioned* from the *visual* viewport,
  never from `dvh`.** iOS does not resize the layout viewport when the
  keyboard opens — it *offsets* it, shifting the visible strip down by
  `visualViewport.offsetTop` while `innerHeight` stays put. Sizing alone is
  not enough: a shell sized to the visual viewport but left sitting at
  layout-viewport top still slides off screen by that same offset. So
  `AppShell`'s `SidebarProvider` is `fixed` and carries both —
  `h-(--vv-height)` for the size, `translateY(var(--vv-offset-top))` for the
  position — and `transform`, not `top`, so it becomes the containing block
  for its `fixed` descendants (the sidebar, `MutationStatus`), which then
  follow the visual viewport for free instead of each needing its own
  correction. `use-viewport-inset` measures `visualViewport` and publishes it
  on `<html>`:

  | Published | Meaning |
  |---|---|
  | `--vv-height` | the visible strip; the shell's height. Defaults to `100dvh` |
  | `--vv-offset-top` | the shell's `translateY`; keeps the app pinned to the visible strip, not just sized to it |
  | `--kb-inset` | the bottom-pinned-fixed correction (`innerHeight − height − offsetTop`); no consumer today now that the shell itself tracks the offset, kept published for `/dev/viewport` |
  | `data-keyboard` | `open` / `closed`, from `innerHeight − height` (the keyboard's own shrink) — not `--kb-inset`, which collapses toward 0 on a large offset and would report the keyboard closed while it is up |
  | `data-vh` | `short` / `tiny`, absent when there is room |

  It is mounted once, in `AppShell`. `/dev/viewport` shows every number live
  and is how they are re-checked on a device.
- **A `max-height` media query cannot see the keyboard** — media queries are
  answered by the layout viewport. Anything that must react to the keyboard
  reads `data-vh` / `data-keyboard`, not `@media`.
- The manifest is `display: standalone`. Added to the Home screen, an iPad
  session gets back the 100–150px Safari spends on its tab and favourites bars.
- Screen rotation must not lose practice session state.
- In iPad portrait (768–834) the sidebar is hidden, content takes the width with 32 padding.
- Bottom sticky panel (lesson) on touch: height 64px + `env(safe-area-inset-bottom)`.
- `overscroll-behavior: none` on `<html>` and on scrolling panels (`overscroll-none` / `overscroll-y-none`), so a Mac rubber-band does not stretch the pane or drag the page.

### Other

- `touch-action: manipulation` on all buttons — removes the 300ms delay.
- `user-select: none` on answer options and letters: a long press must not select text.
- Hovers must not be the only way to learn about an action: table rows show icons on hover on desktop, but on touch they are always visible (`@media (hover: none)`).

---

## 10. States

For every interactive element all states from the list must be defined. A missing state is a defect.

| State | How it looks |
|---|---|
| `default` | Base look |
| `hover` | Background `neutral-150` or border `green-400`; for cards — `translateY(-1px)` + `shadow-lifted`; only `@media (hover: hover)` |
| `active` | Return `translateY(0)`, background one step darker |
| `focus-visible` | Ring from §6 |
| `selected` | Background `accent` `green-100`, border `green-200`, text `accent-foreground` |
| `disabled` | `opacity: 0.5`, `cursor: not-allowed`, no shadows. For a button — background `neutral-200`, text `neutral-500` |
| `loading` | 16px spinner instead of the icon, button width does not change, text remains |
| `correct` | Background `success-bg`, border `success-border`, text `#274C39`, checkmark icon on the right |
| `incorrect` | Background `danger-bg`, border `danger-border`, text `#7D3C35`, cross icon on the right |
| `dimmed` | `opacity: 0.4` — unselected options after an answer |
| `read-only` | Background `muted`, border `border`, normal cursor |

**About the disabled primary button.** Currently in the product the disabled green button looks like a slightly faded active one — people press it. A disabled button must be **gray**, not pale green.

**Cursor.** Every interactive element — button, link, anything with `role="button"` — shows `cursor: pointer` by default. Tailwind's Preflight stopped forcing this on buttons in v3.3 to match the native default, which otherwise leaves every button reading as inert. `disabled` / `aria-disabled` keep the browser's `not-allowed`, per the row above. Listbox-style items (menu, select, command) are the deliberate exception and keep `cursor: default` — hover highlighting already carries the affordance there, matching the native control they stand in for.

---

## 11. Motion

| Token | Duration | Easing | Where |
|---|---|---|---|
| `motion-instant` | 120ms | `cubic-bezier(.4,0,.2,1)` | Hover, focus, background change |
| `motion-fast` | 180ms | `cubic-bezier(.4,0,.2,1)` | Buttons, chips, appearance of feedback |
| `motion-base` | 240ms | `cubic-bezier(.4,0,.2,1)` | Popovers, panel expansion |
| `motion-slow` | 320ms | `cubic-bezier(.2,.8,.2,1)` | Progress bars, ladder segments |
| `motion-page` | 400ms | `cubic-bezier(.2,.8,.2,1)` | Practice screen change |

Rules:
- Progress is animated **always** — this is the only animation the user should notice.
- Question change: the old one leaves `opacity 0 → translateY(-4px)`, the new one arrives `opacity 1 ← translateY(6px)`. Do not move horizontally.
- Pulsing rings on the sound button: 1.5s, `ease-out`, two rings offset by 0.5s, only while sound is playing.
- `@media (prefers-reduced-motion: reduce)` — all `transition-duration: 0.01ms`, rings are not animated, progress changes instantly.

---

## 12. Icons

**Library:** `lucide-react`. Do not mix in other sets.

| Context | Size | Stroke width |
|---|---|---|
| In a line of text, labels | 14 | 1.7 |
| Navigation, list rows, buttons | 17 | 1.7 |
| Icon buttons in the header | 16 | 1.8 |
| Chevrons, arrows | 15 | 1.9 |
| Checkmark/cross in the result | 17 | 2.3 |
| Icon in a mint square (34×34, radius 9) | 17 | 1.8 |
| Round sound button (76–96px) | 26–32 | 1.6 |

Default icon color `muted-foreground`; on an active menu item and on a mint plate — `green-700`.

**Pinned icons:**

| Meaning | lucide |
|---|---|
| Learning map | `map` |
| Today | `calendar-check` |
| My progress | `chart-no-axes-column` |
| Practice | `repeat-2` |
| Grammar (practice) | `a-large-small` |
| Reading | `book-open-text` |
| Grammar (course) | `pencil-line` |
| Topics | `layers` |
| My courses | `heart` |
| My words | `library-big` |
| My sets | `bookmark` |
| Ready-made sets | `sparkles` |
| Sound / play | `volume-2` |
| Repeat | `rotate-ccw` |
| Slow | `clock` |
| Correct | `check` |
| Incorrect | `x` |
| Attention | `triangle-alert` |
| Search | `search` |
| Collapse panel | `panel-left` |
| Delete | `trash-2` |
| Edit | `pencil` |

---

## 13. shadcn components: mapping

**Rule: first look for a component in shadcn, then style it with tokens, and only if there is no such primitive — write your own.** Forking a component is allowed, a hand-rolled alternative to an existing primitive is not.

### Install

```bash
npx shadcn@latest add button input textarea label select checkbox radio-group \
  card badge table tabs progress separator sheet dialog popover tooltip \
  dropdown-menu avatar skeleton scroll-area command pagination accordion \
  alert sonner toggle-group form chart calendar
```

### Correspondences

| Interface element | shadcn component | Setup |
|---|---|---|
| Primary button | `Button variant="default"` | `bg-primary`, `radius-md`, `shadow-xs` |
| Secondary button | `Button variant="outline"` | White background, `border` border |
| Quiet button / action link | `Button variant="ghost"` | Hover `secondary` |
| Icon button | `Button variant="ghost" size="icon"` | 28×28 desktop, 44×44 touch |
| Destructive action | `Button variant="destructive"` | |
| Input field | `Input` | `border-input`, ≥16px |
| Multiline word input | `Textarea` | Auto-grow, `max-height: 220px` |
| Set picker, «10 на странице» | `Select` | |
| Checkboxes in the words table | `Checkbox` | 16×16, `radius-xs` |
| «какие слова» picker | `RadioGroup` | Styled as cards, not as circles |
| Set badge, «нужен звук» label | `Badge` | `variant="secondary"` for mint |
| Course, mode, form card | `Card` (+`CardHeader/Content/Footer`) | |
| «Мои слова» table | `Table` | Header `muted`, rows with `border-subtle` |
| Pagination | `Pagination` | |
| Course progress bar | `Progress` | Height 5px, `radius-full` |
| Memory forecast on `/progress` | `Progress` | Same track; hide until ≥ 20 words with `stability` |
| Study calendar | `Calendar` | Display only, stretches to fill its card (flex `justify-between` per week, not intrinsic `w-fit` — a fixed-width calendar in a wide tablet column read as squeezed into a corner). Cells 32px compact / ≤36px wide, `rounded-(--cell-radius)` set explicitly on a studied day (day-picker only rounds a corner for its own range/selected state, which this manual paint never triggers — without it, consecutive studied days read as one merged bar). A studied day is a filled cell in `data-learning`. Card carries no height cap — a 6-week month needs more room than a 5-week one; capping it clips the last row. `timeZone` is the `tz` cookie. `onSelect` does not navigate. Tooltip and accessible name: date + “N words practised” and/or “Lesson completed” and/or “Story read”. |
| Words practised, 28 days | `Chart` `BarChart` | `ChartContainer` / `ChartTooltip`. Fill `--chart-1` (learned). Short chart (~180–220px). Not pie. |
| Divider | `Separator` | |
| Mobile sidebar | `Sheet side="left"` | |
| Delete confirmation | `Dialog` / `AlertDialog` | |
| Source picker panel | `Popover` | `shadow-pop`, width = trigger width |
| Icon hints | `Tooltip` | Do not show on touch |
| User menu | `DropdownMenu` | |
| Avatar | `Avatar` | 32×32, initials 11.5px/600 |
| Notifications | `Sonner` | Position `bottom-right`, desktop; `top-center` on phone |
| List loading | `Skeleton` | |
| Long lists | `ScrollArea` | |
| In-app search (⌘K) | `Command` | |
| Frequently asked questions | `Accordion` | |
| «где ошибаются» callout | `Alert` | Custom `warning` variant |
| Session size toggle (6/10/15) | `ToggleGroup type="single"` | |
| Auth forms | `Form` + `react-hook-form` + `zod` | |

**Every `Popover` keeps `min-w-[200px]`** (set once on `PopoverContent`, not per
usage) — short content (a single word, one line of gloss) must not collapse
the panel into a narrow strip. A caller can still cap the top with its own
`max-w-*`, as the story gloss popover does at 300px.

### Button variants — exact sizes

| size | Desktop height | Touch height | Padding | Type size |
|---|---|---|---|---|
| `sm` | 32 | 40 | 6 × 14 | 14 |
| `default` | 40 | 44 | 10 × 20 | 15 |
| `lg` | 48 | 52 | 13 × 26 | 16 |
| `icon` | 28 | 44 | — | — |

---

## 14. Custom components

Components that shadcn does not have. Built from primitives, live in `components/slova/`.

### `<Eyebrow>`
Section overline. Props: `children`.
`overline`, color `eyebrow`, `uppercase`, `margin-bottom: 10px`.

### `<PageHeader>`
`Eyebrow` + `h1` + `lead`. Props: `overline`, `title`, `description`, `actions?`.
The live prop is `eyebrow` (the type style is still overline).
Spacing below to the content — 40px.

### `<StageRail>` — brainstorm ladder
Horizontal row of columns, one per session word.
Props: `words: { id, en, stage }[]`, `total: number`, `currentId`.
- Column: width 54px (desktop) / 38px (tablet), segments 5px high, gap 2px, `radius: 2px`.
- Empty segment `neutral-200`; filled `green-400`; for a completed word all segments `green-700`.
- Fill transition — `motion-slow`.

> **Ban on word labels.** Under the column stands an **ordinal number** (`1`–`6`), for a completed one — a checkmark. Neither the English word nor the translation. Reason: the correct answer is always one of the session words, so a labeled ladder shows the answer right on the screen — especially crude in «собрать из букв» and «перевод → слово» formats, where the answer is read verbatim.
>
> This same rule extends to any element visible during the question: browser tab title, tooltips, `aria-label`, pop-up hints, debug panels. The column `aria-label` is «Слово 3: 2 из 5 ступеней», without the content.
>
> The session composition is revealed only twice: on the start screen (before beginning) and on the final one (after).

- Label: `11px`, `tabular-nums`, `neutral-400`; current word — `neutral-900/600`; completed — checkmark in `green-400`.
- The current column is additionally marked with an inner outline on the segments, not by the label color — so it also works for color-blind users.

### `<ProgressSteps>` — lesson steps
A row of 26×4px segments, `radius-full`. Completed — `green-400`, current — `green-700`, future — `neutral-200`.

### `<PlayButton>`
Round sound button. Props: `size: 'sm'|'lg'`, `playing`, `onPlay`.
- `lg` — 96px (practice «на слух»), `sm` — 76px (brainstorm).
- White background, `border` border, icon `green-700`, `shadow-lifted`.
- While playing — two expanding rings `green-400`.
- Hover `translateY(-2px)`.

### `<OptionButton>` — answer option
Props: `index`, `children`, `state: 'idle'|'correct'|'incorrect'|'dimmed'`, `disabled`.
- One column, width 100%, height ≥ 48 (desktop) / 56 (touch).
- On the left a 22×22 number, `radius-xs`, background `secondary`, type size 11.5. On hover — background `accent`.
- On the right space for the result icon (17px).
- Hover: border `green-400` + `translateX(2px)`.
- **Used in all practice and in lesson practice with no exceptions.**

### `<LetterTiles>` — assemble a word
Props: `word`, `onComplete(guess)`.
- Cells by letter count: 38×46 (touch 44×52), bottom border 2px `neutral-300`, filled — `green-400`, letter `h2` Literata.
- Letter tiles: 42×42 (touch 48×48), `radius-md`, hover `translateY(-2px)`, used — `opacity 0.25`, `disabled`.
- Keyboard input, `Backspace` returns the last one.
- Checking happens automatically when the last cell is filled.
- **A phrase is the same component with word tiles.** `give up` deals two tiles, never seven. Word tiles are auto-width (`min-width` 44, padding 12), same height as letter tiles. The first letter of a remaining tile still types from the keyboard.

### `<AnswerFeedback>`
Result row under the answer. Props: `state`, `correctAnswer?`, `note?`.
On the left a «Верно» / «Неверно» badge with an icon, then the correct answer, then a utility note («ступень 2 → 3»). Appears over `motion-fast`, without shifting the layout: the container has a fixed height of 44px.

### `<KeyHints>`
`caption`, `neutral-500`, `<kbd>` elements: 11px, white background, border, `border-bottom-width: 2px`, `radius-sm`, padding 1×6. Hide at `pointer: coarse`.

### `<SourceBar>` + `<SourcePanel>`
Study source picker row and expanding panel (`Popover`).
Props: `state`, `sets`, `counts`, `onChange`.
Counters are recalculated on the fly when filters change. If the result is < 5 words — show a `warning` warning, but do not block.

### `<WordRow>`
Words table row: checkbox, English, Russian, set badges (full title, stacked; column max-width 148px, truncated with ellipsis and a tooltip for the full name), «выучено» scale (5 dots 6px, gap 4px), actions on hover.

### `<LessonRow>`
Lesson row: marker (checkmark in a `green-700` circle / number in a circle), title `h4`, translation `caption`, time, chevron. Next lesson — background `neutral-25` + 2px left inset `green-700` + «Продолжить» badge.

### `<RuleExample>`
Example in a lesson: 2px left rule `green-100`, left padding 16, English sentence `h4` Literata, translation `caption` `muted-foreground`.

### `<Token>`
Word form: monospace `token`, background `neutral-150`, `radius-sm`, padding 1.5×6. Ending highlight inside — `<mark>` with color `#2F7D5C` and background `#DFF0E5`.

### `<Callout variant="warning|note">`
«Где обычно ошибаются» callout: background `warning-bg`, border `warning-border`, `radius-lg`, padding 18×20, heading `overline` + `triangle-alert` icon.

### `<GrainOverlay>`
`position: fixed; inset: 0; z-index: 0; pointer-events: none`, SVG noise. One per application, in the root layout.

---

## 15. Screen specifications

### 15.1 Shared app shell

```
┌────────────┬──────────────────────────────────────┐
│  Sidebar   │  [ TopBar — only in focus modes ]     │
│  268px     │  Container (by page type)             │
│  sticky    │                                       │
│            │                                       │
│  ────────  │                                       │
│  User      │                                       │
└────────────┴──────────────────────────────────────┘
```

**Sidebar:** header (logo `h3` Literata 600 + search + collapse), sections `Занятия` (`Тренировки`, `Грамматика`, **Истории**, **Мой прогресс**) and `Словарь` (`Мои слова`, `Мои наборы`), footer with the user. **Истории** (`/stories`, `book-open-text`) is the third Study item; **Мой прогресс** (`/progress`, `chart-no-axes-column`) is the fourth. Both own their active state; neither is in the account menu. The account menu keeps language and sign-out, and — on iPad Safari only, and only until the site is installed — one quiet line saying that «Поделиться» → «На экран „Домой"» gives a session the whole screen (§9). A sentence rather than a control: there is no API that adds a site to the Home screen, so the most the interface can do is say where the button is. Section heading — `caption`/`500` color `eyebrow`, **not in caps**. Item: 8×10, `radius-sm`, icon 17px.

### 15.2 Focus mode (practice, brainstorm, lesson)

A separate shell. Required elements:

1. **Top bar** (`sticky`, `scrim-panel`, border at the bottom): exit on the left, progress in the center, counter on the right.
2. **The sidebar is dimmed** to `opacity: 0.4`, returns on hover. On touch — not dimmed, but hidden.
3. **Fixed-height task zone** — 186px. The content changes, not the geometry.
4. **Answer zone** — minimum 240px, always on the same vertical regardless of format.
5. **Result footer** — 44px, always occupies space, even when empty.
6. Container `container-focus` (540px), vertically centered in the area.

**The zones are equal, not constant.** Points 3–5 exist so that changing the
format does not move anything; they do not require one number each. An iPad in
landscape with the keyboard up leaves ~300px where the tall set of zones asks
for ~700, and a scene that cannot be seen has not been kept from jumping — it
has been lost. So the heights are `--focus-*` in `app/globals.css` at three
sizes, chosen by `data-vh` (§9):

| | tall | `short` | `tiny` | `data-keyboard="open"` |
|---|---|---|---|---|
| top bar | 64 | 52 | 48 | 44 |
| task line margin | 20 | 12 | 8 | 6 |
| task zone | 150 / 96 compact | 104 / 76 | 76 / 60 | *(content-sized)* |
| answer zone | 232 / 132 compact | 168 / 104 | 120 / 88 | 0 |
| result footer | 52 | 48 | 44 | 0 |
| scene padding | 32 / 72 | 16 | 12 | 8 |

Every size at rest keeps the equality between formats — the three columns
before the last one are a promise about comparing questions side by side.
With the keyboard up there is one format on screen and nothing to compare it
to, so `data-keyboard="open"` does not add a fourth size to that promise, it
suspends it: the answer zone and result footer collapse to nothing, `FocusFooter`
and `KeyHints` render null outright, and the scene shrinks to exactly what the
learner is looking at — the task line and the prompt.

Two further rules follow from the same place:

- On `short` and `tiny` the scene packs from the top and the answer zone drops
  its vertical centring. Centring a scene taller than the strip puts its top
  above the scroll origin, where nothing reaches it.
- While `data-keyboard="open"` the task line and the prompt share one `sticky`
  container under the top bar, with a `scrim-panel` behind it — not the prompt
  alone. Safari scrolls the focused field into view and takes everything above
  it along, including the line that says what to do; pinning both together in
  a single sticky box is the one arrangement a scroll cannot pull apart without
  also pulling the two sticky boxes on top of each other.

### 15.3 Landing

Container 1120. Block order: header → hero (text on the left + Trainings mockup on the right, top-aligned) → numbers bar → four-step lifecycle → «Словарь» section → «Практика» section → «Истории» section → «Грамматика» section → dark CTA bar (`inverse-surface`) + footer inside it.

Словарь → Практика → Истории is one continuous vocabulary narrative; Грамматика is the parallel branch before the close. Only one block has an inverted background — the closing bar. Window chrome appears once, in the hero; every later still is `chrome="panel"`.

Requirements: the last button no weaker than the first; each mockup differs in framing from the neighboring one.

**Stills must not invent a product.** A decorative still renders live data or nothing: the shell's navigation comes from `NAV_SECTIONS` and is highlighted by href, never by a second list of sections or a historical screen name; the story preview comes from `loadMarketingStoryStill()`, which goes through the real loader and segment builder. Do not write English, a translation, or a learner count into marketing JSX — an anonymous visitor has no words, and a fabricated «12 слов готовы» is how the landing came to advertise a screen that had been deleted. Stills stay `aria-hidden` with pointer events off, so pseudo-controls take no `tabIndex`, button semantics, or handlers.

### 15.4 My words

Container 780. Order: `PageHeader` → «Добавить слова» (card: header with column labels `overline`, two auto-growing `Textarea`s, footer with a set `Select` and a button) → paste-format hint → «Все слова» (search + set filter → bulk action bar → `Table` → `Pagination` + «на странице»).

### 15.5 Course catalog

Container 780. The screen’s job is **continue or start**, not “browse the library”. Two modes; full-catalog threshold: live courses **≥ 6** or they occupy **≥ 2** CEFR steps.

**Small catalog** (today). Order: `PageHeader` (title, no manifesto, no section eyebrow repeat, no «Что такое курс» card) → Grammar Review card, **only while at least one rule is due** → level bar (A1–B2 segment; «откуда уровень» label, one short line, only while the source is `assumed`) → flat list of live courses at the selected level, started ones on top, including a started course at another level → «Скоро» at the selected level, collapsed, with a count in the trigger. No search, sorting, or «Все / Мой уровень».

**Full catalog** (after the threshold). Order: `PageHeader` → level bar → on the first visit a «Что такое курс» card → toolbar (search, sorting, «Все / Мой уровень») → list grouped by CEFR (own level open, below — collapsed; above are marked «выше вашего уровня») → «Скоро» at the selected level, collapsed. On search, sort by title/started, and the «Мой уровень» filter the list is flat, without shelves. Empty search — `Empty` + «Сбросить».

**Grammar Review card.** One compact `Card` at the catalog width, above the level bar: `overline` «Повторение», `h4` «Повторить слабые правила», one `text-caption` line with the rule count, course count and estimated minutes, a restrained rotate icon, and one primary «Начать повторение» to `/courses/grammar/review`. It is absent when nothing is due — no disabled card, no «всё повторено» state, no tab, dashboard grid, score ring, or per-course review card. Spec: `docs/plans/shipped/grammar-review.md` §14.

A course row is one action with a verb: not started → «Начать» to the table of contents; in progress → «Продолжить» to the next lesson; completed → «Пройден» to the table of contents. There is no separate “you are taking” card and no separate page for that: started ones sit on top. If the selected level has no live courses — `Empty` + an action to go to a level where they exist, not a grid of someone else’s «Скоро».

### 15.6 Lesson

Container 700. Top bar with `ProgressSteps` and «Урок N из M · ~T минут». Body — sections with `overline` subheadings, separated by 44px. Sticky bottom bar: «К урокам» + «Начать практику · N вопросов».

**Pass size.** Lesson lock-in is **10 questions** from a pool (≥16). Course final test is **12 questions**. Each attempt is taken anew: composition (for a lesson), order, and `choice` / `pick-sentence` options are shuffled. Do not show the same list from top to bottom.

### 15.7 Progress (`/progress`)

Container `container-dashboard` (1040). The wider width is only for this grid; list and lesson containers stay as they are. Entry: fourth item in Study, after Trainings, Grammar and Stories. `/tasks/progress` redirects here.

Order: `PageHeader` (eyebrow «Прогресс», title «Ваш прогресс» — never the learner’s name; one quiet subtitle that describes the page; 24px gap to content on desktop, 20px on mobile) → if the dictionary is empty: `Empty` + «Добавить слова», mention that grammar will appear later, no grid of zeros → otherwise a compact grid (`gap-4`, card `p-4`):

1. Up to four metric tiles in one row when the content area is ≥ 960px, two columns on tablet and phone. Default: current streak (record as secondary), words practised today, learned count (dictionary size as secondary), memory forecast when ≥ 20 words have `stability`, otherwise this week’s study days. Literata `numeral`. A 2–3px data accent is allowed; no filled tile backgrounds. Target tile height 132–148px.
2. Three compact cards on wide screens: Vocabulary (segmented bar, learned / learning / new, `hitRate` stays off, footer link to My words), Study days (intrinsic-width shadcn `Calendar`, 32px cells compact / ≤ 36px wide, green dots, never `w-full`, card ≤ 380px tall, grid ≤ 296px wide), Word practice (28-day bars, chart ~180–220px). No view switch.
3. Two list cards: Grammar (up to three course rows with a thin `Progress`, in-progress before completed, then most recently started; «View all grammar» if more exist) and Needs attention (up to five words by lapses, English + count). Each hides when empty. Until a stable word-detail route exists, rows are not links; one footer goes to My words. No blank grid cells.

Metric tiles are allowed on this screen only. Do not draw hours, weekly stacked bars, a 1500 ring, hex badges, or pie/donut. Sitting minutes are written to Postgres; they appear here only after a later batch, once ≥ 14 days of sittings exist. A single training may still show its own minutes on the summary screen (client).

### 15.8 Stories (`/stories`, `/stories/[slug]`)

The one screen in the app that is a reading surface, not a list, a form, or one question at a time. Full spec: `docs/plans/shipped/stories.md` §6.

**Catalog** (`/stories`) — container `container-list` (780), same shell as My words: `PageHeader` → one `LessonRow kind="next"` card for the story to read next (level · minutes · word counts, `Button size="lg"` «Читать») → «Все истории» as divided rows (level chip, Literata `h4` title, `text-caption` description, minutes, chevron) → «Прочитанные» as a collapsed `Accordion` with a count in the trigger. Rows, not cards — a card per story repeats the failure §15.7 already ruled out.

**Reader** (`/stories/[slug]`) — container `container-prose` (700). Phase 1, reading: paragraphs in `text-story`, annotated words underlined (2px, `green-400`, 3px offset, `text-decoration-skip-ink: auto` — never a filled background), sticky bottom bar with «Ответить на вопросы». A tap opens a `Popover` gloss: surface + base form (`<Token>`, only when it differs), `SpeakButton`, the contextual gloss, dictionary state, an add action. Phase 2, questions: the text is replaced, not pushed down (`motion-page`, §11); `ProgressSteps` in the top bar; `OptionButton`/`OptionList` via `GrammarQuestion`, one column, no re-read control. Phase 3, summary: three facts in a row (not `MetricTile` — §15.7 confines those to `/progress`), primary action to `/practice`.

No cover art, reading-time ring, per-word difficulty colouring, or second accent for new-vs-learning words (§20).

### 15.9 My texts (`/texts`, `/texts/[id]`)

The reader's own texts, pasted. Full spec: `docs/plans/shipped/reader.md` §5–6.

**List** (`/texts`) — container `container-list` (780), the same shell as §15.8: `PageHeader` → the paste field immediately below it, as §16 requires of an empty vocabulary → «Ваши тексты» as divided rows (title, word count, chevron, a `ghost` delete). The paste field is a `Textarea`, `min-h-40`, and the title input appears only once something has been pasted, offering the first line as its placeholder.

**Reader** (`/texts/[id]`) — container `container-prose` (700), paragraphs in `text-story`, exactly as the story reader renders them.

Marks: a word **in the dictionary** is underlined 2px at 3px offset — `data-learned` when learned, `data-learning` while it is being studied. A word that is **not** in the dictionary carries no mark. This is not the LingQ model and the difference is deliberate: this dictionary holds what somebody chose to study, not everything they know, so marking the absent words underlines nearly the whole page and tells the reader nothing. The share is a number, and it belongs in the coverage header, not in the prose. Never a filled background, and never a third colour — §20 stands.

---

## 16. Empty states, loading, errors

| Situation | What to show |
|---|---|
| Vocabulary is empty | Heading `h3`, a line of explanation, paste field immediately below it. Do not draw an illustration. |
| Search found nothing | A row in the table body: «Ничего не нашлось. Попробуйте другой запрос или снимите фильтр» + `ghost` button «Сбросить фильтры» |
| No words to review | «На сегодня всё. Следующие слова подойдут <дата>» + secondary action «Взять новые» |
| List loading | `Skeleton` in the shape of the content: rows of the needed height, not a spinner |
| Translation loading | In the translation cell — a `Skeleton` 60% wide, not «…» text |
| Network error | `Alert variant="destructive"` in the page body + «Повторить» button. Toasts only for background operations |
| Word has no sound | Sound button `disabled` + `Tooltip` «Произношение появится позже» |
| Session fewer than 5 words | Do not block, show a warning in the source panel |

Every error message answers two questions: what happened and what to do next. «Что-то пошло не так» without an action is unacceptable.

---

## 17. Text and tone

- The interface is in Russian. English — only learning material and grammar topic names (`Present Simple`, `Forms`).
- Address as «вы» with a lowercase letter.
- The letter «ё» is used.
- Quotes are «ёлочки», inside — „лапки“.
- Dash — em dash, with spaces. Hyphen in words — short, without spaces.
- Numbers from four digits — with a thin non-breaking space: `8 172`.
- Ranges with an en dash without spaces: `1–4`.
- Headings without a period at the end. Captions and hints — with a period if it is a sentence.
- A button names the action with a verb: «Заниматься», «Добавить слова», «Продолжить». Not «ОК», not «Отправить».
- Do not apologize for technical limitations in the interface. Instead of «Браузер сам звук не включит» — just a button.
- Unified terminology: **слово**, **набор**, **тренировка**, **формат**, **курс**, **урок**, **ступень**, **повторение**. Do not mix «упражнение/задание/тест».

---

## 18. Accessibility

### Contrast (verified)

| Pair | Ratio | Level |
|---|---|---|
| `foreground` on `background` | 14.98 | AAA |
| `neutral-700` on `background` | 6.95 | AA |
| `muted-foreground` on `background` | 4.91 | AA |
| `eyebrow` (`green-600`) on `background` | 5.54 | AA |
| White on `primary` (`green-700`) | 8.60 | AAA |
| `green-700` on `accent` (`green-100`) | 7.06 | AAA |
| `success-600` on `success-bg` | 4.70 | AA |
| `danger-600` on `danger-bg` | 4.93 | AA |
| `warning-600` on `warning-bg` | 5.00 | AA |

`neutral-500` (3.10) — **forbidden for text** that carries meaning. Only placeholders, disabled elements, decorative icons.

### Other

- Correctness/error is conveyed not only by color: an icon (`check` / `x`) and a verbal label are required.
- All interactive elements are reachable from the keyboard, tab order matches the visual.
- `aria-live="polite"` on the answer result block and on the progress counter.
- Round sound button: `aria-label="Прослушать слово"`.
- Progress: `role="progressbar"` with `aria-valuenow/valuemin/valuemax`.
- Modal windows return focus to the trigger on close.
- Language of learning fragments is marked: `<span lang="en">become</span>` — otherwise the screen reader reads the English word in Russian.

### Keyboard

| Key | Action |
|---|---|
| `1`–`4` | Choose an answer option |
| `Пробел` | Repeat sound (in formats with sound) |
| `Enter` | Check / go to the next |
| `Backspace` | Return a letter in «собрать слово» |
| `Esc` | Exit focus mode (with confirmation if the session is not finished) |
| `⌘K` / `Ctrl+K` | In-app search |

---

## 19. Implementation

### 19.1 Tokens — `app/globals.css`

The full file sits alongside: **`globals.css`**. Included once, all shadcn components read from it.

### 19.2 Structure

```
app/
  layout.tsx            // fonts, grain class on body, ThemeProvider
  globals.css
components/
  ui/                   // shadcn — do not edit by hand unless needed
  page-header.tsx       // PageHeader
  slova/                // custom from §14
    eyebrow.tsx
    stage-rail.tsx
    progress-steps.tsx
    play-button.tsx
    option-button.tsx
    letter-tiles.tsx
    answer-feedback.tsx
    key-hints.tsx
    source-bar.tsx
    word-row.tsx
    lesson-row.tsx
    rule-example.tsx
    token.tsx
    callout.tsx
  layout/
    app-shell.tsx       // sidebar + container
    focus-shell.tsx     // practice mode
    sidebar.tsx
lib/
  utils.ts              // cn()
```

### 19.3 Code rules

- Component variants — via `class-variance-authority`, as in shadcn. Do not proliferate boolean props.
- Colors in components only through semantic Tailwind classes (`bg-card`, `text-muted-foreground`). Hardcoded hex is forbidden.
- Sizes — through the Tailwind scale. Arbitrary values `[13px]` are allowed only for typographic tokens from §3, expressed as utilities (`text-caption`, `text-overline`).
- Every custom component accepts `className` and forwards it through `cn()`.
- No `localStorage` in presentational components; session state — in a store/on the server.

### 19.4 Order of reworking the existing interface

1. Connect fonts and `globals.css`, remove old variables.
2. Replace primitives with shadcn (`Button`, `Input`, `Select`, `Table`, `Badge`, `Card`).
3. Assemble `AppShell` and `FocusShell`, move all pages onto them.
4. Introduce `OptionButton` and `AnswerFeedback` and replace **all** question screens with them — this eliminates the divergence between practice and lesson practice.
5. Introduce `StageRail` and `ProgressSteps`, remove static counters.
6. Go through §16: add empty states and skeletons.
7. Run through §9 at widths 768 / 834 / 1024 / 1194.

---

## 20. What not to do

- Do not add photographs, stock illustrations, or three-dimensional objects.
- Do not introduce a second accent color. If another meaning is needed — it is a shade of the neutral scale or a utility color.
- Do not use gradients, except the thin top bar and the grain overlay.
- Do not put shadows on elements that do not float above others.
- Do not vertically center columns of different heights.
- Do not show a counter that does not change after a user action.
- Do not set `font-size` smaller than 16px on input fields.
- Do not rely on hover as the only carrier of information.
- Do not write text in caps in the markup.
- Do not mix icon sets and do not draw icons with different stroke weights.
- Do not make answer options in two columns.
- Do not leave the disabled primary button green.
- **Do not show during a question anything that contains the answer:** neither labels on the progress indicator, nor tooltips, nor the tab title, nor an `aria-label` with the word. Check every new practice UI element with this question.
