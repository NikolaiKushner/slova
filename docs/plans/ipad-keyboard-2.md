# iPad — round 2: the shell is anchored to the wrong viewport

Round 1 (`docs/plans/ipad-keyboard.md`, shipped in #50) sized the scroller from
`visualViewport.height` and added short/tiny zone steps. On a real iPad Pro 11″
in landscape it is still broken. Six screenshots from 2026-08-21, Safari with
the favourites bar, drill and grammar review: the top bar is gone, the task
line is gone, the field sits under a truncated question, and ~150px of empty
page hangs between the field and the keyboard.

Round 1 fixed the *height*. It never fixed the *position*, and it left the
reserved zones reserving space nobody can afford while typing.

## 1. What the screenshots prove

Device: 1180 × 820 css (iPad Pro 11″ M4), landscape, Safari with tab +
favourites bar. Read off the pixels:

| | css px |
|---|---|
| browser chrome | 0 – 121 |
| visible web content | 121 – 400 |
| keyboard (incl. QuickType) | 400 – 820 |
| **`visualViewport.height`** | **≈ 279** |
| `window.innerHeight` | ≈ 699 |

### The decisive detail

`FocusTopBar` is `sticky top-0` inside the `SidebarInset` scroller
(`components/layout/focus-shell.tsx:44`). **No amount of internal scrolling can
hide it.** It is hidden anyway — only a 10-15px sliver of it survives under the
favourites bar.

So the scroller is not merely scrolled. The whole shell has moved *above* the
visible strip. That is `visualViewport.offsetTop`, and it is exactly what
WebKit is documented to do: it does not resize the layout viewport for the
keyboard, it **offsets the layout viewport** so the focused field stays in
view ([WebKit bug 259770][wk], [htmhell][htm]).

`hooks/use-viewport-inset.ts` measures `offsetTop`, publishes it as
`--vv-offset-top`, and **nothing in the app consumes it**:

```
$ grep -rn 'vv-offset-top' app components
app/globals.css:195:  --vv-offset-top: 0px;
```

Two consequences, both visible:

- everything anchored at layout-viewport top slides up by `offsetTop`: the
  shell (`SidebarProvider`, height `--vv-height`, sitting at document top) and
  the sidebar (`fixed inset-y-0 h-dvh`, `components/ui/sidebar.tsx:237`) — the
  sidebar in every screenshot is clipped at the top, its own scroll untouched;
- the shell now *ends* `offsetTop` px above the keyboard, which is one half of
  the dead space.

### The second half of the dead space

Measured on IMG_0263 (grammar), input bottom at 248 css, shell bottom at ≈ 388:

| below the field | px |
|---|---|
| unused `--focus-answer-h` remainder (120 − 52 input) | 68 |
| `FocusFooter` + `mt-5` (`--focus-footer-h` tiny = 44) | 64 |
| `--focus-pad-y` | 12 |
| **total reserved, empty, while typing** | **≈ 144** |

144px of nothing, in a 279px strip, next to a task line that had to be
scrolled off to make room. That is the whole bug in one line.

### Why the task line specifically disappears

`FocusPrompt` is sticky while the keyboard is open (round 1, step 3).
`FocusHead` — the line that says *what to do* — is its sibling above it and is
not sticky. When WebKit scrolls the scroller to reveal the field, the head is
the first thing to go. The user's complaint is literal: «не видно, что надо
сделать».

### The 0261 case

IMG_0261: Safari's chrome auto-hidden, `innerHeight` grew, and only the bottom
sliver of the field is on screen. Here the arithmetic itself fails:

```ts
inset = max(0, innerHeight - height - offsetTop)   // lib/viewport-inset.ts:24
keyboard = inset >= 120
```

`offsetTop` is a *scroll* offset; the keyboard's shrink is `innerHeight −
height`. Subtracting one from the other conflates two unrelated quantities. On
a large offset the inset collapses to 0 and **`keyboard` reports `closed`
while the keyboard is up** — the sticky prompt switches off at the worst
possible moment. `--kb-inset` is right for its one consumer
(`mutation-status.tsx`, a bottom-pinned fixed bar); it is wrong as a keyboard
detector.

## 2. The fix

### Step 1 — anchor the shell to the visual viewport *(the core)*

`AppShell`'s `SidebarProvider` currently sizes itself to the visual viewport
but still sits at layout-viewport top. Give it the offset too:

```tsx
<SidebarProvider
  className="fixed inset-x-0 top-0 h-(--vv-height) min-h-0 overflow-hidden"
  style={{ transform: "translateY(var(--vv-offset-top))" }}
>
```

`transform` rather than `top`, for one reason worth the trade: a transformed
ancestor becomes the containing block for its `fixed` descendants, so the
sidebar (`fixed inset-y-0`) and `MutationStatus` (`fixed bottom-4`) follow the
visual viewport for free instead of each needing its own correction.

That trade has a price to pay in the same commit: `components/ui/sidebar.tsx`
resolves `inset-y-0 h-dvh` against the provider now, so `h-dvh` → `h-full`
there and in `components/layout/sidebar.tsx:181`. Check the `Sheet` variant
below 1024 in the same pass — it is `fixed` too.

Then `html, body { height: 100%; overflow: hidden }` so the document has
nothing to scroll and WebKit has one fewer way to move the page.

Verify on device with `/dev/viewport`: with the field focused, the probe's
`offsetTop` must be non-zero **and** the top bar must still be on screen.

### Step 2 — separate the two measurements

`lib/viewport-inset.ts`:

```ts
keyboardHeight = max(0, innerHeight - height)              // detection
bottomInset    = max(0, innerHeight - height - offsetTop)  // bottom-pinned fixed
keyboard       = keyboardHeight >= KEYBOARD_MIN
```

Keep `--kb-inset` = `bottomInset` for now. Once step 1 lands, `MutationStatus`
lives inside a visual-viewport-sized box and can go back to a plain `bottom-4`
— do that and `--kb-inset` loses its last consumer.

`tests/unit/viewport-inset.test.ts` gains the IMG_0261 case: `innerHeight 820,
height 279, offsetTop 420` → `keyboard: true`. Today it returns `false`.

### Step 3 — stop reserving space that cannot be spared

§15.2's fixed zones exist so the answer starts on the same line in all seven
formats. That promise is about comparing *between* questions at rest. With the
keyboard up there is one format on screen, no next question to compare it to,
and 144px of reserved emptiness pushing the question off the top.

So `:root[data-keyboard="open"]` in `app/globals.css`:

```css
--focus-answer-h: 0px;
--focus-answer-compact-h: 0px;
--focus-footer-h: 0px;
--focus-head-mb: 6px;
--focus-pad-y: 8px;
--focus-topbar-h: 44px;
```

and `FocusFooter` renders nothing while the keyboard is open (the verdict
cannot arrive before the answer is submitted, and step 6 dismisses the
keyboard on submit). `KeyHints` likewise — a touch session has no key hints to
give.

This needs a matching row in `docs/design-system.md` §15.2: the zones are
equal across formats *at rest*; while a field is focused the scene collapses to
what the learner is looking at.

### Step 4 — keep the task line, not just the question

Make the sticky block head + prompt, not prompt alone. In `FocusShell`, when
`keyboard` is open, wrap `FocusHead` and `FocusPrompt` in one
`sticky top-(--focus-topbar-h)` container with the `bg-background` scrim
currently on the prompt.

Simplest shape that keeps the call sites unchanged: `FocusShell` accepts the
head and the prompt as slots rather than as free children, or `FocusPrompt`
grows an optional `head` prop. Prefer the slot — six screens render
`<FocusHead>` as a plain child today (`practice-session.tsx:439`,
`grammar-review-session.tsx`, `lesson-player.tsx` ×4, `brainstorm-session.tsx`,
`story-reader.tsx`), and a slot makes the sticky pairing structural instead of
a convention each screen has to remember.

Also drop `FocusHead`'s step line while the keyboard is open — the top bar's
progress bar already carries the count.

### Step 5 — the budget, checked rather than hoped

Target, landscape iPad Pro 11″ with full Safari chrome, keyboard up, 279px:

| zone | px |
|---|---|
| `FocusTopBar` | 44 |
| `--focus-pad-y` | 8 |
| `FocusHead` (task line + mb) | 26 |
| `FocusPrompt` — one word, `text-2xl` | 60 |
| `FocusAnswer` — the 52px field row + `mt` | 64 |
| `--focus-pad-y` | 8 |
| **total** | **210** |

69px of headroom. A two-line grammar sentence spends ~28 of it and still fits.
That headroom is the point: round 1 balanced on ~390 into ~300 and lost.

Portrait (1180 tall, ~390 keyboard, ~121 chrome → ~670 strip) is not tight
either way; this is a landscape fix that portrait inherits.

### Step 6 — dismiss the keyboard on submit

`question-view.tsx` `Typed` / `VerbForms` and `exercise-view.tsx`: `blur()` the
field in `submit()`. The verdict and `AnswerReveal` then get the whole screen
back, and the footer returns with it. Two lines, and it removes the only case
where step 3's collapsed footer would have mattered.

### Step 7 — belt and braces for the iOS 26 dismissal bug

`offsetTop` is documented not to return to 0 after the keyboard closes. On
`keyboard: closed`, `requestAnimationFrame(() => window.scrollTo(0, 0))` and
re-measure once more on the next frame. Round 1's `unpublish()` resets the vars
but only when the last subscriber unmounts, which is never during a session.

### Step 8 — verify the autofocus gate on the device

Round 1 gated autofocus on `(pointer: fine)`. On iPadOS that can report `true`
— Apple Pencil and hover both muddy it — and if it does, the keyboard opens on
arrival and the learner never sees the question at all, which matches what the
screenshots show. `/dev/viewport` already prints `pointer: fine`
(`app/dev/viewport/page.tsx:48`). Read it on the device; if it says `да`, gate
on `!(pointer: coarse)` instead.

## 3. Files

| File | Change |
|---|---|
| `components/layout/app-shell.tsx` | fixed + `translateY(--vv-offset-top)` (1) |
| `components/ui/sidebar.tsx` | `h-dvh` → `h-full`, check the `Sheet` (1) |
| `components/layout/sidebar.tsx` | `h-dvh` → `h-full` (1) |
| `app/globals.css` | `html,body` lock (1); `[data-keyboard=open]` zone step (3) |
| `lib/viewport-inset.ts` | split `keyboardHeight` from `bottomInset` (2) |
| `tests/unit/viewport-inset.test.ts` | the IMG_0261 case (2) |
| `components/slova/mutation-status.tsx` | back to plain `bottom-4` (2) |
| `components/layout/focus-shell.tsx` | head+prompt sticky slot, footer off (3,4) |
| six `Focus*` call sites | pass the head as a slot (4) |
| `components/practice/question-view.tsx` | `blur()` on submit (6) |
| `components/courses/exercise-view.tsx` | `blur()` on submit (6) |
| `hooks/use-viewport-inset.ts` | scroll reset on close (7) |
| `hooks/use-fine-pointer.ts` | maybe `(pointer: coarse)` (8) |
| `docs/design-system.md` | §15.2 keyboard row, §9 note (3) |

## 4. Order

| | Step | Why here |
|---|---|---|
| 1st | **1** — anchor to the visual viewport | Nothing else can be judged until the shell stops sliding off screen |
| 2nd | **2** — fix the arithmetic | One-line cause of the worst screenshot; unit-testable without a device |
| 3rd | **3 + 4** — collapse the zones, pin the task line | The 144px and the missing «что делать» |
| 4th | **6** — blur on submit | Two lines, independent |
| 5th | **5 + 7 + 8** — measure, dismissal bug, autofocus gate | Needs the iPad in hand |

## 5. Verification

Per CLAUDE.md, this one is not done until it has been looked at on the device.

- `/dev/viewport` on the iPad, field focused, both orientations, Safari with
  and without the favourites bar, and standalone: record `innerHeight`,
  `visualViewport.height`, `offsetTop`, `pointer: fine`. Replace §1's table
  with the real numbers.
- A real «написать слово» drill and a real grammar review, landscape, keyboard
  up: top bar, task line, question, field and «Проверить» all on screen at
  once, with no gap above the keyboard.
- Desktop regression: no `visualViewport` movement → `--vv-offset-top` stays
  `0px`, `translateY(0)`, geometry byte-identical. Check `/dev/kit` and a drill
  at 768 / 834 / 1024 / 1194.
- `npm test`, and a production build (this touches `globals.css`).

## 6. What we are still not doing

Unchanged from round 1: `interactive-widget=resizes-content` is still
Chromium/Firefox only and still unimplemented in WebKit ([bug 259770][wk]); the
VirtualKeyboard API and `env(keyboard-inset-height)` are still Chromium only; a
`position: fixed` bottom bar holding the field is still the exact thing the
keyboard covers.

[wk]: https://bugs.webkit.org/show_bug.cgi?id=259770
[htm]: https://www.htmhell.dev/adventcalendar/2024/4/
