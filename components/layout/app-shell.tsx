"use client";

import { AppSidebar } from "@/components/layout/sidebar";
import { BrandWordmark } from "@/components/brand-mark";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useViewportInset } from "@/hooks/use-viewport-inset";
import { cn } from "@/lib/utils";

/**
 * The named content widths from §8. A screen picks one; it does not get to
 * invent another, which is the whole point of naming them.
 */
const CONTAINERS = {
  prose: "container-prose", // 700 — lesson rule, legal pages
  list: "container-list", // 780 — my words, lesson lists, catalog
  wide: "container-wide", // 840 — trainings
  dashboard: "container-dashboard", // 1040 — progress grid only
  focus: "container-focus", // 540 — question screen
  marketing: "container-marketing", // 1120 — landing
} as const;

export type ContainerKind = keyof typeof CONTAINERS;

/**
 * Page width and horizontal padding, in one place.
 *
 * The specification puts the `container` prop on `AppShell`, but in the App
 * Router a layout renders before it knows which page it wrapped, so a shell
 * cannot read a per-page prop. The width therefore travels with the page and
 * the chrome stays in the layout. Same rule holds either way: a screen names
 * a container, never a number.
 */
export function PageContainer({
  container = "wide",
  className,
  children,
}: {
  container?: ContainerKind;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full", CONTAINERS[container], className)}>
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  /*
   * Mounted here and nowhere else: this is the frame every study screen is
   * drawn in, so measuring it once covers all of them. It publishes the
   * visible strip onto `<html>` — `--vv-height`, `--kb-inset`, `data-vh`,
   * `data-keyboard` — and everything below reads those rather than the hook.
   */
  useViewportInset();

  return (
    /*
     * `--vv-height`, not `dvh`. iOS shrinks only the visual viewport when the
     * keyboard opens, so `100dvh` keeps the height the window had before it —
     * and this frame, being the scroller, then hides its bottom half behind
     * the keyboard while Safari scrolls the question off the top to reach the
     * field. The variable falls back to `100dvh` (globals.css) wherever the
     * hook has nothing to say, so nothing changes on a desktop.
     */
    <SidebarProvider className="h-(--vv-height) min-h-0 overflow-hidden">
      <AppSidebar />
      {/*
        Scroll lives here, not on the document. iOS Safari hides its URL bar
        when the page itself moves, and a `fixed` sidebar sized to `svh` then
        stops short of the new viewport — a gap under the menu on iPad.
      */}
      <SidebarInset className="min-h-0 overflow-y-auto overscroll-y-none bg-transparent">
        {/*
          Below 1024 the sidebar is a Sheet (§8), so this is the only way to
          open it. It matches the breakpoint in `use-mobile.ts`; if the two
          ever disagree, iPad in portrait gets no menu at all.
        */}
        <header className="flex min-h-14 shrink-0 items-center gap-2 px-5 pt-[env(safe-area-inset-top)] lg:hidden">
          <SidebarTrigger className="-ml-1" />
          <BrandWordmark className="text-xl" />
        </header>
        {/*
          Page padding from §7 and §8, read from --page-* in globals.css.
          Pages do not set these — that is what made them drift — and
          FocusShell cancels exactly these values to reach the edges.
        */}
        <div className="flex flex-1 flex-col px-(--page-px) pt-(--page-pt) pb-(--page-pb)">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
