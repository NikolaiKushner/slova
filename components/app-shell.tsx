"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        {/* Mobile-only open control; desktop toggle lives next to the logo */}
        <header className="flex h-14 shrink-0 items-center gap-2 px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <p className="font-display text-xl tracking-tight">Slova</p>
        </header>
        <div className="flex flex-1 flex-col px-4 pb-16 pt-2 md:px-8 md:pt-6">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
