import * as React from "react"

import { showInstallHint } from "@/lib/install-hint"

/**
 * Nothing here changes while the tab is open — a browser does not become
 * Safari, and installing the site opens a new window rather than converting
 * this one — so the store never notifies and the answer is worked out once.
 */
let cached: boolean | null = null

function compute() {
  return showInstallHint({
    userAgent: navigator.userAgent,
    standalone:
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  })
}

const subscribe = () => () => {}

function getSnapshot() {
  cached ??= compute()
  return cached
}

/** Is this the browser that should be told about «На экран „Домой"»? */
export function useInstallHint() {
  // The server cannot know, and a wrong guess would render a line and then
  // take it away; `false` renders nothing until the client has looked.
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
