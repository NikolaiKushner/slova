import * as React from "react"

import {
  readViewport,
  sameViewport,
  type ViewportInset,
} from "@/lib/viewport-inset"

/**
 * The visible strip of the window, as an external store.
 *
 * One store for the whole application, not one per component: the strip is a
 * property of the window, and every subscriber must agree about it. Mounting
 * the hook anywhere starts the measuring; the last unmount stops it.
 *
 * While it runs it publishes the reading on `<html>`, so that layout can be
 * written in CSS instead of in props:
 *
 * - `--vv-height`     — height of the strip (default `100dvh`, see globals.css)
 * - `--kb-inset`      — what the keyboard covers, for anything pinned to the
 *                       bottom of the window
 * - `--vv-offset-top` — diagnosis only; nothing is positioned from it yet
 * - `data-keyboard`   — `open` | `closed`
 * - `data-vh`         — `short` | `tiny`, absent when there is room
 *
 * `/dev/viewport` shows all of it live, which is how the numbers above were
 * chosen and how they get re-checked on a real iPad.
 */

/** Before the first measurement — and on a server, which has no window. */
const UNMEASURED: ViewportInset = {
  height: 0,
  inset: 0,
  offsetTop: 0,
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
    // No `visualViewport` (a browser old enough that the keyboard was never
    // going to be reported anyway): the strip is the window, and everything
    // below behaves exactly as it did before this hook existed.
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

  snapshot = next
  publish(next)
  for (const listener of listeners) listener()
}

/*
 * `scroll` fires as fast as a finger moves and `resize` fires through the
 * keyboard's whole animation, so the reading is taken once a frame. The events
 * only ask for a measurement; they never carry one.
 */
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
  // Measured once here so the very first render already has real numbers;
  // after that `measure` owns the value and this only hands it back, without
  // allocating on every render.
  if (snapshot === UNMEASURED) snapshot = read()
  return snapshot
}

export function useViewportInset() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => UNMEASURED)
}
