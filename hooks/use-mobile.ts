import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Cached so getSnapshot returns without allocating on every render. Created
 * lazily: touching window at module scope would break server rendering.
 */
let mediaQuery: MediaQueryList | null = null

function getMediaQuery() {
  mediaQuery ??= window.matchMedia(MOBILE_QUERY)
  return mediaQuery
}

function subscribe(onStoreChange: () => void) {
  const mql = getMediaQuery()
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

/**
 * Reads the viewport as what it is — an external store — rather than mirroring
 * it into state and syncing with an effect. The mirrored version rendered
 * twice on every mount (once as `undefined`, once with the real value), which
 * is what `react-hooks/set-state-in-effect` was pointing at.
 *
 * The server has no viewport, so it assumes desktop, matching the old
 * `undefined` that `!!isMobile` coerced to false.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => getMediaQuery().matches,
    () => false,
  )
}
