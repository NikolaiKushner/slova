import * as React from "react"

import { showInstallHint } from "@/lib/install-hint"

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

export function useInstallHint() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
