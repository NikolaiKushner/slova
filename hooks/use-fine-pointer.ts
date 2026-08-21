import * as React from "react"

/* A mouse or a trackpad; a finger is `(pointer: coarse)`. */
const FINE_POINTER_QUERY = "(pointer: fine)"

/**
 * Cached for the same reason `use-mobile` caches its query: `getSnapshot` runs
 * on every render and must not allocate. Created lazily, because touching
 * `window` at module scope would break server rendering.
 */
let mediaQuery: MediaQueryList | null = null

function getMediaQuery() {
  mediaQuery ??= window.matchMedia(FINE_POINTER_QUERY)
  return mediaQuery
}

function subscribe(onStoreChange: () => void) {
  const mql = getMediaQuery()
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

/**
 * Is there a pointing device on the desk, as opposed to a finger on the glass?
 *
 * The server has no pointer and assumes one — that is the mouse-driven session
 * this codebase has always assumed, so the guess costs nothing where it is
 * wrong: it is only ever read from an effect, never rendered.
 */
export function useFinePointer() {
  return React.useSyncExternalStore(
    subscribe,
    () => getMediaQuery().matches,
    () => true,
  )
}

/**
 * Focus on mount — but only where a keyboard is already on the desk.
 *
 * §9: «In «написать слово» practice do not open the keyboard automatically on
 * the first question — focus on tap instead. Autofocus on iPad covers half the
 * screen.» On iPad it covers more than half: iOS does not shrink the layout
 * viewport for the keyboard, so Safari scrolls the field into the strip that
 * is left and the question goes off the top edge. A field the learner has not
 * asked for must not do that to the question.
 *
 * The `autoFocus` attribute cannot express this — it fires before any hook can
 * say where it is firing — so the focus moves into an effect and the attribute
 * comes off.
 */
export function useAutoFocus<T extends HTMLElement>(enabled = true) {
  const fine = useFinePointer()
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    if (!enabled || !fine) return
    ref.current?.focus()
  }, [enabled, fine])

  return ref
}
