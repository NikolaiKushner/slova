"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { BrandWordmark } from "@/components/brand-mark";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-dvh min-h-dvh overflow-hidden">
      <AppSidebar />
      {/*
        Scroll lives here, not on the document. iOS Safari hides its URL bar
        when the page itself moves, and a `fixed` sidebar sized to `svh` then
        stops short of the new viewport — a gap under the menu on iPad.
      */}
      <SidebarInset className="min-h-0 overflow-y-auto overscroll-y-contain bg-transparent">
        {/* Mobile-only open control; desktop toggle lives next to the logo */}
        <header className="flex min-h-14 shrink-0 items-center gap-2 px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <SidebarTrigger className="-ml-1" />
          <BrandWordmark className="text-xl" />
        </header>
        {/* Width is the page's call, not the shell's — see components/page.tsx */}
        <div className="flex flex-1 flex-col px-4 pb-16 pt-2 md:px-8 md:pt-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
