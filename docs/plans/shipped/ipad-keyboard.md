# iPad — the on-screen keyboard hides the question

**Status:** shipped 2026-08-21. Kept because code comments cite it — see `CLAUDE.md` → Plans.

Status: implemented 2026-08-21 on `feat/ipad-keyboard`, awaiting maintainer
review and — the one thing a laptop cannot supply — the on-device numbers of
step 0. Everything marked *(est.)* below is still an estimate; `/dev/viewport`
exists to replace it. One item is deliberately unbuilt: the «Установить на
iPad» hint of step 5, because §15.1 says what the account menu holds and
adding a third thing to it is a design call, not an implementation detail.
Screens: every `FocusShell` session that has a text field —
`components/practice/question-view.tsx` (`Typed`, `VerbForms`),
`components/courses/exercise-view.tsx` (`Typed`)
Numbers below marked *(est.)* are read off the code, not off a device. Step 0
replaces them with measurements.

## 1. What actually happens

Four things stack up. Only the fourth is visible to the learner.

1. **iOS Safari does not resize the layout viewport for the keyboard.** It
   shrinks only the *visual* viewport. `100dvh` reacts to the URL bar
   collapsing, never to the keyboard — so `h-dvh` keeps its full pre-keyboard
   height, and the bottom half of it is simply covered.
   ([bram.us](https://www.bram.us/2021/09/13/prevent-items-from-being-hidden-underneath-the-virtual-keyboard-by-means-of-the-virtualkeyboard-api/))
2. **Our scroller is that container.** `AppShell` puts scroll on
   `SidebarInset` inside `SidebarProvider className="h-dvh min-h-dvh
   overflow-hidden"` (`components/layout/app-shell.tsx`). The scroller stays
   as tall as the viewport was before the keyboard opened.
3. **WebKit then scrolls the focused field into view inside that scroller.**
   The scene is taller than the strip that is still visible, so the scroll
   necessarily pushes everything above the field — `FocusHead` (the task line)
   and `FocusPrompt` (**the question itself**) — off the top edge.
4. **Browser chrome eats 100–150px before any of this.** Tab bar + favourites
   bar on iPad Safari. That is why it fails on a chrome-heavy iPad and not in a
   phone-sized Safari with minimal chrome.

### Height budget of a session (est., from the code)

| Zone | drill | grammar review (`compact`) |
|---|---|---|
| `FocusTopBar` `min-h-16` | 64 | 64 |
| shell padding top / bottom | 32 / 72 | 44 / 40 |
| `FocusHead` (task + step + `mb-5`) | ~54 | ~54 |
| `FocusPrompt` | 150 | 96 |
| `FocusAnswer` + `mt-5` | 252 | 152 |
| `FocusFooter` + `mt-5` | 72 | 72 |
| `KeyHints` | ~30 | ~30 |
| **total** | **~700** | **~520** |

Against an iPad 11″ **landscape** (1194×834): 834 − ~140 chrome ≈ 690 usable,
minus a ~350–410 keyboard (incl. the QuickType bar) → **280–340px left**. A
~700px scene into 300px: the top 350–400px, which is exactly head + prompt,
goes off screen.
**Portrait** (834×1194): ~1050 usable − ~390 keyboard ≈ 660 — the drill still
does not fit, the grammar review barely does. Split View / Stage Manager is
worse than either.

**So this is not one bug.** The container must learn the keyboard's height, the
scene must shrink when the strip is short, and the question must be pinned so
that no scroll can take it away. Plus one free win: standalone PWA deletes the
browser chrome outright.

## 2. What we deliberately will not do

- **`interactive-widget=resizes-content`** in the viewport meta — the clean
  platform fix, implemented in Chromium 108+ and Firefox 132+, **not in
  WebKit** ([WebKit bug 259770](https://bugs.webkit.org/show_bug.cgi?id=259770)).
  We add it anyway (Next `viewport.interactiveWidget`) because it costs one
  line and helps Android, but it fixes nothing on iPad.
- **VirtualKeyboard API / `env(keyboard-inset-height)`** — Chromium only.
- **A `position: fixed` bottom bar** holding the input — fixed is anchored to
  the layout viewport, which is precisely what ends up under the keyboard.
- **A custom in-page keyboard.** No.

## 3. The plan

### Step 0 — measure (blocking the numbers, not the work)

Add `/dev/viewport`, dev-only alongside `/dev/kit`, with no link from the app:
a live readout of `innerHeight`, `visualViewport.height / offsetTop / scale`,
the four `env(safe-area-inset-*)`, `document.activeElement`, and a text field
to focus. Open it on the real iPad — portrait and landscape, with and without
the favourites bar, in Safari and after "Add to Home Screen" — and write the
numbers back into this document, replacing every *(est.)*.

Everything below is designed against estimates. Step 0 turns them into facts,
and stays afterwards as the regression check.

### Step 1 — teach the shell the visual viewport *(the core fix)*

New `hooks/use-viewport-inset.ts`, shaped like `use-mobile.ts`
(`useSyncExternalStore`, no state mirroring):

- subscribe to `visualViewport` `resize` **and** `scroll`, rAF-throttled;
- publish on `<html>`:
  - `--vv-height` = `visualViewport.height`px,
  - `--kb-inset` = `max(0, innerHeight − vv.height − vv.offsetTop)`,
  - `data-keyboard="open" | "closed"` — open above a ~120px threshold, so an
    iPad **hardware** keyboard's accessory bar (~55px) does not count as a
    keyboard and shrink the screen for nothing;
- reset the vars on blur / `data-keyboard="closed"`, which also works around
  the iOS 26 bug where `offsetTop` never returns to 0 after dismissal;
- never fires on desktop → zero behaviour change there.

Then in `app-shell.tsx` the scroll frame becomes
`height: var(--vv-height, 100dvh)` instead of `h-dvh`, so the scroller *ends*
where the keyboard starts and the sticky `FocusTopBar` stays on screen.

Two dependants must follow the same variable, or they get buried:
`MutationStatus` (`fixed bottom-4`, `components/slova/mutation-status.tsx`) →
`bottom: calc(1rem + var(--kb-inset))`; the sidebar `Sheet` on <1024.
The sidebar itself keeps `100dvh` — it is not the scroller, and §8 mandates
`dvh` there.

### Step 2 — a short-viewport size for `FocusShell`

§15.2's fixed zone heights are a promise that the scene does not jump between
formats. Keep the promise; make the numbers responsive instead of constant.

Move them out of the components into `app/globals.css` (which is what the
design system asks for anyway — §"only through tokens"):

```css
:root { --focus-prompt-h: 150px; --focus-answer-h: 232px;
        --focus-footer-h: 52px; --focus-head-mb: 20px; }
/* one short step, and one very short step */
[data-vh="short"], @media (max-height: 700px) { 96px / 168px / 44px / 12px }
[data-vh="tiny"],  @media (max-height: 520px) { 64px / 132px / 40px / 8px }
```

`FocusPrompt` / `FocusAnswer` / `FocusFooter` read `min-h-(--focus-prompt-h)`
etc. The `compact` prop stays as it is — it is about the *format* (a lesson
sentence vs a drill word), not about the device; the two multiply.

Important: a `max-height` media query is evaluated against the **layout**
viewport, so it does not react to the keyboard at all. The switch therefore
comes from the same hook as step 1 — `data-vh` on `<html>`, computed from
`--vv-height` — and the media query is only the fallback for a genuinely short
desktop window. Both selectors set the same three variables: one source of
numbers.

Also in short mode: `FocusTopBar` → `min-h-12`, `FocusHead` drops its step
line, `KeyHints` is hidden (a touch session has no keyboard hints to give).

### Step 3 — pin the question while typing

Even compacted, 96 + 168 + 44 + 48 ≈ 356 is at the edge of the landscape
budget. So while `data-keyboard="open"`:

- `FocusPrompt` becomes `position: sticky; top: <top bar height>` with the
  existing `scrim-panel` background — the question is always the first thing
  under the bar, whatever iOS decides to scroll;
- the prompt steps down one notch on the type scale (`text-3xl` → `text-2xl`)
  in short mode;
- `FocusAnswer` drops `justify-center` and packs from the top, so the field
  sits directly under the question rather than floating below it.

This is the step that literally answers *"не видно, что надо сделать"*: after
it, the question cannot leave the screen even if every other estimate is wrong.

### Step 4 — stop opening the keyboard ourselves *(ship this first)*

§9 already says it: *«In «написать слово» practice do not open the keyboard
automatically on the first question — focus on tap instead. Autofocus on iPad
covers half the screen.»* Three places violate it today:
`question-view.tsx` `Typed` (`autoFocus`), `question-view.tsx` `FormField`
(`autoFocus` on the past-form field), `exercise-view.tsx` `Typed:290`.

Change: autofocus only under `matchMedia('(pointer: fine)')` — a laptop
session stays Enter-driven end to end, a touch session shows the whole question
and opens the keyboard when the learner taps the field. Small
`hooks/use-fine-pointer.ts`, same shape as `use-mobile.ts`.

While in these files: add `enterKeyHint="go"` (iPad labels the return key
"Go") and `inputMode="text"`, completing §9's field checklist that already has
`autoCapitalize` / `autoCorrect` / `spellCheck`.

### Step 5 — remove the browser chrome altogether

100–150px of the problem is Safari's own UI, and the learner can delete it in
two taps. Add `app/manifest.ts` (Next's built-in convention):
`display: "standalone"`, name/short_name, `theme_color: "#F1F3F2"` matching the
existing `viewport.themeColor`, `background_color`, icons from the existing
`app/icon.svg` and `app/apple-icon.tsx`, `start_url: "/tasks/today"`.

In iOS/iPadOS 26, "Add to Home Screen" makes any site standalone by default;
the manifest is what makes the name, icon and start route ours instead of
guessed.

The tile itself is `app/apple-icon.tsx`, drawn from `brandIconSvg()` in
`lib/brand.ts`: the brand S on a pane of light glass, sized to half the square
the way iOS 26's own icons are. Full bleed — iOS applies the squircle — and
SVG rather than Satori layout, because the shadow under the S is a Gaussian
blur and `next/og` rasterises through resvg, which has filters where Satori's
CSS subset does not.

The manifest keeps `/icon.svg` alongside it. A launcher that prefers the
vector gets a bare green S on the white backdrop it draws itself, which is the
flat variant of the same mark — worth a real 512px PNG one day, not worth a
route today.

Then one quiet line, not a nagging banner: in the account menu (or on the
session summary) an «Установить на iPad» hint explaining Share → «На экран
"Домой"», shown only when `navigator.standalone === false` on an iPad, gone
once standalone.

Caveat, and the reason this is step 5 rather than step 1 despite removing the
most pixels: standalone iOS web apps have their own reported keyboard bugs (a
blank scrollable gap at the bottom after the keyboard closes). Step 1's hook
must already be in place, and step 0 must be re-measured in standalone mode.

## 4. Files

| File | Change |
|---|---|
| `app/dev/viewport/page.tsx` | new, dev-only probe (step 0) |
| `hooks/use-viewport-inset.ts` | new (step 1) |
| `hooks/use-fine-pointer.ts` | new (step 4) |
| `components/layout/app-shell.tsx` | scroller height from `--vv-height` |
| `components/layout/focus-shell.tsx` | zone heights from vars, sticky prompt |
| `components/slova/mutation-status.tsx` | `bottom` respects `--kb-inset` |
| `components/practice/question-view.tsx` | autofocus, `enterKeyHint` |
| `components/courses/exercise-view.tsx` | autofocus, `enterKeyHint` |
| `app/globals.css` | `--focus-*` tokens + short/tiny steps |
| `app/layout.tsx` | `interactiveWidget: "resizes-content"` (Android only) |
| `app/manifest.ts` | new (step 5) |
| `docs/design-system.md` | §9 and §15.2 amendments |
| `tests/unit/viewport-inset.test.ts` | new |

## 5. Verification

- **On the iPad, by hand** — CLAUDE.md: a screen that has only been
  type-checked has not been checked. Play a real «написать слово» drill and a
  real grammar review, portrait and landscape, Safari and standalone.
- `/dev/viewport` numbers before and after, both orientations.
- **Unit tests** for the pure part, which is the arithmetic:
  `inset(innerHeight, vv.height, vv.offsetTop)` → inset + open/closed,
  including the iOS 26 case where `offsetTop` stays non-zero after dismissal,
  and the short/tiny thresholds.
- **Desktop regression**: with no `visualViewport` events the vars fall back to
  `100dvh` and drill geometry is identical to today — check `/dev/kit` and a
  drill in a laptop window, then at 768 / 834 / 1024 / 1194 from §8.

## 6. Design system

The document has to move with the code, not after it:

- **§9 «iPad and touch input»** gains a Layout rule: the session scroller is
  sized from the *visual* viewport, not `dvh`, because iOS does not resize the
  layout viewport for the keyboard; and a note on the standalone PWA.
- **§15.2** gains a short-viewport row: the fixed zones keep their *equality*
  across formats — that is the actual principle — but their value is a token
  with three steps, and the prompt is sticky while a field is focused.

## 7. What the branch does

Verified in Chromium at 1194×834, then 1194×690, then with `visualViewport`
made to report a 380px keyboard — a drill and a grammar lesson both:

| | tall (834) | short (690) | keyboard (310) |
|---|---|---|---|
| `data-vh` | absent | `short` | `tiny` |
| `--vv-height` | 834px | 690px | 310px |
| `--kb-inset` | 0 | 0 | 380px |
| task zone | 150px | 104px | 76px, `sticky` |
| answer zone | 232px | 168px | 120px |

At 310px the top bar, the task line, the question, the field and «Проверить»
are all on screen at once, in both a typed drill and a grammar gap — and after
scrolling the strip to its end the question is still pinned under the bar. The
tall column is byte-identical to what the screens did before the branch.

## 8. Order and effort

| | Step | Effort | Note |
|---|---|---|---|
| 1st | **4** — no autofocus on touch | ~30 min | Independent, immediate relief: the question stays visible until the learner taps |
| 2nd | **0** — measure | ~half a sitting | Turns the estimates above into numbers |
| 3rd | **1** — visual viewport | one sitting | The real fix |
| 4th | **2 + 3** — short mode + sticky prompt | one sitting | Needs the device to tune |
| 5th | **5** — PWA manifest | one sitting | Independent; deletes the chrome |

Branch `feat/ipad-keyboard`, per CLAUDE.md one branch for the whole batch, no
commit before the maintainer has looked at each unit.
