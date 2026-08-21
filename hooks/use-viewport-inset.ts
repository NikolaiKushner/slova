import * as React from "react"

import {
  readViewport,
  sameViewport,
  type ViewportInset,
} from "@/lib/viewport-inset"

const UNMEASURED: ViewportInset = {
  height: 0,
  inset: 0,
  offsetTop: 0,
  keyboardHeight: 0,
  keyboard: false,
  size: "tall",
}

let snapshot: ViewportInset = UNMEASURED
const listeners = new Set<() => void>()
let frame = 0

function read(): ViewportInset {
  const visual = window.visualViewport
  return readViewport({
    innerHeight: window.innerHeight,
    height: visual?.height ?? window.innerHeight,
    offsetTop: visual?.offsetTop ?? 0,
  })
}

function publish(next: ViewportInset) {
  const root = document.documentElement
  root.style.setProperty("--vv-height", `${next.height}px`)
  root.style.setProperty("--kb-inset", `${next.inset}px`)
  root.style.setProperty("--vv-offset-top", `${next.offsetTop}px`)
  root.dataset.keyboard = next.keyboard ? "open" : "closed"

  if (next.size === "tall") delete root.dataset.vh
  else root.dataset.vh = next.size
}

function unpublish() {
  const root = document.documentElement
  root.style.removeProperty("--vv-height")
  root.style.removeProperty("--kb-inset")
  root.style.removeProperty("--vv-offset-top")
  delete root.dataset.keyboard
  delete root.dataset.vh
}

function measure() {
  frame = 0
  const next = read()
  if (sameViewport(next, snapshot)) return

  const closed = snapshot.keyboard && !next.keyboard
  snapshot = next
  publish(next)
  for (const listener of listeners) listener()

  if (closed) {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      schedule()
    })
  }
}

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(measure)
}

function start() {
  const visual = window.visualViewport
  visual?.addEventListener("resize", schedule)
  visual?.addEventListener("scroll", schedule)
  window.addEventListener("resize", schedule)
  window.addEventListener("orientationchange", schedule)
  measure()
}

function stop() {
  const visual = window.visualViewport
  visual?.removeEventListener("resize", schedule)
  visual?.removeEventListener("scroll", schedule)
  window.removeEventListener("resize", schedule)
  window.removeEventListener("orientationchange", schedule)

  if (frame) cancelAnimationFrame(frame)
  frame = 0
  snapshot = UNMEASURED
  unpublish()
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  if (listeners.size === 1) start()

  return () => {
    listeners.delete(onStoreChange)
    if (listeners.size === 0) stop()
  }
}

function getSnapshot() {
  if (snapshot === UNMEASURED) snapshot = read()
  return snapshot
}

export function useViewportInset() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => UNMEASURED)
}
