# iPad round 2 — build sheet

**Status:** shipped 2026-08-21. Kept because code comments cite it — see `CLAUDE.md` → Plans.

The reasoning is in `docs/plans/shipped/ipad-keyboard-2.md`. This file is the thing to
work from: eight units, each one reviewable diff, in the order they must land.

Branch: `feat/ipad-keyboard-2` — one branch for the batch, per CLAUDE.md.
No commit before the maintainer has read the unit's diff. `npm test` after
every unit; a production build after U3 and at the end (`globals.css` moves).

Legend: **[laptop]** verifiable in a desktop browser · **[ipad]** needs the
device in hand.

---

## U1 — anchor the shell to the visual viewport **[laptop + ipad]**

The core fix. Round 1 sized the shell from `visualViewport.height` but left it
sitting at layout-viewport top, so WebKit's keyboard offset slides it off
screen. Nothing reads `--vv-offset-top` today.

**`components/layout/app-shell.tsx`** — `SidebarProvider` gains position and
the offset:

```tsx
<SidebarProvider
  className="fixed inset-x-0 top-0 h-(--vv-height) min-h-0 overflow-hidden"
  style={{ transform: "translateY(var(--vv-offset-top))" }}
>
```

`transform`, not `top`: a transformed ancestor becomes the containing block for
its `fixed` descendants, so the sidebar and `MutationStatus` follow the visual
viewport without each needing its own correction. `min-h-0` must stay —
`SidebarProvider`'s own root carries `min-h-svh` (`components/ui/sidebar.tsx:145`)
and only tailwind-merge dropping it keeps the shell from being svh-tall.

**`components/ui/sidebar.tsx:237`** and **`components/layout/sidebar.tsx:181`**
— `h-dvh` → `h-full`. Both now resolve against the transformed provider, and
`dvh` there would overshoot the visual viewport by the keyboard's height.

**`app/globals.css`**, `@layer base` (~line 406):

```css
html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }
```

The document then has nothing to scroll and WebKit has one fewer way to move
the page. Scroll already lives on `SidebarInset`.

Check in the same pass: the `Sheet` sidebar below 1024 is `fixed` too — open it
on a narrow window and confirm it still covers the screen rather than the
provider's box.

**Verify [laptop]:** `/dev/kit` and a drill at 768 / 834 / 1024 / 1194.
`--vv-offset-top` stays `0px`, `translateY(0)`, geometry identical to today.
**Verify [ipad]:** `/dev/viewport`, focus the field — `offsetTop` non-zero
**and** the probe's fixed bar still on screen. Then a drill: the top bar must
survive with the keyboard up. It does not have to look good yet — U3 does that.

---

## U2 — separate keyboard height from bottom inset **[laptop]**

`lib/viewport-inset.ts:24` computes `inset = innerHeight − height − offsetTop`
and detects the keyboard from it. `offsetTop` is a scroll offset; the
keyboard's shrink is `innerHeight − height`. On a large offset the inset
collapses to 0 and `keyboard` reports `closed` with the keyboard up — the
IMG_0261 state, where the sticky prompt switches off at the worst moment.

**`lib/viewport-inset.ts`** — `ViewportInset` gains `keyboardHeight`:

```ts
const keyboardHeight = Math.max(0, Math.round(reading.innerHeight - reading.height));
const inset = Math.max(0, Math.round(reading.innerHeight - reading.height - reading.offsetTop));
// keyboard: keyboardHeight >= KEYBOARD_MIN
```

`inset` keeps its meaning and its name — it is the bottom-pinned-fixed
correction, and `KEYBOARD_MIN` keeps its job of not counting a hardware
keyboard's ~55px accessory bar. Add `keyboardHeight` to `sameViewport`.

**`components/slova/mutation-status.tsx:37`** — after U1 this bar lives inside a
visual-viewport-sized, transformed box, so `bottom-[calc(1rem+var(--kb-inset))]`
double-counts. Back to plain `bottom-4`. `--kb-inset` then has no consumer:
leave the variable published (it costs nothing and `/dev/viewport` prints it),
delete the `calc`.

**`tests/unit/viewport-inset.test.ts`** — the IMG_0261 case:
`{ innerHeight: 820, height: 279, offsetTop: 420 }` → `keyboard: true`,
`keyboardHeight: 541`, `inset: 0`. Today that returns `keyboard: false`.

**Verify:** `npm test`.

---

## U3 — collapse the reserved zones while typing **[laptop]**

Measured on IMG_0263: 68px of unused `--focus-answer-h` + 64px of footer +
12px of padding = ~144px of reserved emptiness below the field, in a 279px
strip, paid for by scrolling the task line off the top.

§15.2's equal zones are a promise about comparing questions *at rest*. With a
field focused there is one format on screen and nothing to compare it to.

**`app/globals.css`**, after the `[data-vh="tiny"]` block:

```css
:root[data-keyboard="open"] {
  --focus-topbar-h: 44px;
  --focus-head-mb: 6px;
  --focus-answer-h: 0px;
  --focus-answer-compact-h: 0px;
  --focus-footer-h: 0px;
  --focus-pad-y: 8px;
}
```

Order matters: this must come after `[data-vh]` so it wins — both are one class
of specificity on `:root`.

**`components/layout/focus-shell.tsx`** — `FocusFooter` returns `null` while
`useViewportInset().keyboard`. The verdict cannot arrive before submit, and U6
dismisses the keyboard on submit, so nothing is lost. Same for `KeyHints`
wherever the screens render it — a touch session has no key hints to give.

Budget this buys, landscape iPad Pro 11″ with full Safari chrome, 279px:
44 top bar + 8 pad + 26 head + 60 prompt + 64 field row + 8 pad = **210**.
69px of headroom; a two-line grammar sentence spends ~28 of it.

**Verify [laptop]:** the `/dev/viewport` probe can fake it — set
`data-keyboard="open"` on `<html>` by hand in devtools at a 300px-tall window
and walk a drill and a grammar review.

---

## U4 — the task line must survive **[laptop]**

`FocusPrompt` is sticky while the keyboard is open; `FocusHead` — the line that
says what to do — is its sibling above and is not, so WebKit's scroll-into-view
takes it first. This is the literal complaint.

**`components/layout/focus-shell.tsx`** — `FocusShell` gains a `head` slot, and
renders head + prompt inside one sticky container carrying the `bg-background`
scrim that is on `FocusPrompt` today:

```tsx
<FocusShell topBar={…} head={<FocusHead task={…} />}>
```

A slot, not a `head` prop on `FocusPrompt`: five screens render `<FocusHead>` as
a plain child today and a slot makes the sticky pairing structural instead of a
convention each screen has to remember. Call sites to move:

- `components/practice/practice-session.tsx:441`
- `components/practice/brainstorm-session.tsx:303`
- `components/courses/grammar-review-session.tsx:295`
- `components/courses/lesson-player.tsx:424`
- `components/stories/story-reader.tsx:145`

`FocusHead` also drops its `step` line while the keyboard is open — the top
bar's `LinearProgress` already carries the count, and §15.2 already forbids
saying it twice.

**Verify [laptop]:** all five screens, keyboard faked open as in U3, then
scroll the strip to its end: top bar, task line and question all still pinned.

---

## U5 — measure on the device, replace the estimates **[ipad]**

Every number in `ipad-keyboard-2.md` §1 is read off screenshot pixels. Replace
them with `/dev/viewport` readings, the way round 1's step 0 was meant to and
never got done.

Grid: portrait × landscape, Safari with and without the favourites bar,
standalone (Add to Home Screen). For each: `innerHeight`,
`visualViewport.height`, `offsetTop`, `--kb-inset`, `pointer: fine`.

Write them into `ipad-keyboard-2.md` §1 and re-check U3's budget against the
worst cell. If the strip is under 210px anywhere, the prompt steps down a notch
on the type scale (`text-3xl` → `text-2xl`) under `[data-keyboard="open"]`.

---

## U6 — dismiss the keyboard on submit **[laptop]**

Two lines, independent of everything above, and it removes the only case where
U3's collapsed footer could have mattered.

- `components/practice/question-view.tsx` — `Typed.submit()` and
  `VerbForms.submit()`: `inputRef.current?.blur()` after the verdict is sent.
  `VerbForms` needs a ref on the active field or a
  `(document.activeElement as HTMLElement)?.blur()`.
- `components/courses/exercise-view.tsx:269` — same in `Typed.submit()`, which
  already holds `inputRef` at line 264.

The keyboard closes, `data-keyboard` flips to `closed`, the zones come back and
`AnswerReveal` gets the whole screen.

**Verify [laptop]:** desktop must not regress — blurring after Enter is fine
there, but check that the next question still autofocuses (`useAutoFocus` runs
per-question because `key` remounts the component).

---

## U7 — the iOS 26 dismissal bug **[ipad]**

`offsetTop` is documented not to return to 0 after the keyboard closes, which
would leave the shell translated down over empty space. Round 1's `unpublish()`
resets the vars only when the last subscriber unmounts — never, during a
session.

**`hooks/use-viewport-inset.ts`** — when a measurement flips `keyboard` to
`false`, `requestAnimationFrame(() => { window.scrollTo(0, 0); schedule(); })`
so the offset is forced and then re-read one frame later.

**Verify [ipad]:** open the keyboard, dismiss it with the keyboard's own hide
button, and confirm the top bar sits under the browser chrome with no gap.

---

## U8 — check the autofocus gate on the device **[ipad]**

Round 1 gated autofocus on `(pointer: fine)`. On iPadOS that can report `true`
— Apple Pencil and hover both muddy it — and if it does, the keyboard opens on
arrival and the learner never sees the question at all, which is consistent
with the screenshots.

`/dev/viewport` already prints it (`app/dev/viewport/page.tsx:48`). Read it on
the device. If it says `да`, change `hooks/use-fine-pointer.ts` to gate on
`!matchMedia("(pointer: coarse)").matches` and keep the hook's name honest —
rename to `useAutoFocus`'s actual condition rather than "fine pointer".

If it says `нет`, autofocus was never the cause and this unit is closed with a
line in `ipad-keyboard-2.md` saying so.

---

## Done when

- **On the iPad, by hand** — CLAUDE.md: a screen that has only been
  type-checked has not been checked. A real «написать слово» drill and a real
  grammar review, landscape, keyboard up: top bar, task line, question, field
  and «Проверить» all on screen at once, no gap above the keyboard.
- Both orientations, Safari and standalone.
- Desktop regression: `/dev/kit` and a drill at 768 / 834 / 1024 / 1194,
  geometry identical to `main`.
- `npm test` green, production build green.
- `docs/design-system.md`: §15.2 gains the keyboard row (zones are equal
  between formats *at rest*; a focused field collapses the scene to what the
  learner is looking at), §9 gains the note that the shell is positioned from
  the visual viewport, not only sized by it.
- `ipad-keyboard-2.md` §1 carries device numbers, not screenshot arithmetic.
