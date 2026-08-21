import * as React from "react"

const FINE_POINTER_QUERY = "(pointer: fine)"

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

export function useFinePointer() {
  return React.useSyncExternalStore(
    subscribe,
    () => getMediaQuery().matches,
    () => true,
  )
}

export function useAutoFocus<T extends HTMLElement>(enabled = true) {
  const fine = useFinePointer()
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    if (!enabled || !fine) return
    ref.current?.focus()
  }, [enabled, fine])

  return ref
}
