"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimezoneCookie } from "@/components/timezone-cookie";

export function AppProviders({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) {
  return (
    <SessionProvider session={session}>
      <TimezoneCookie />
      <TooltipProvider>{children}</TooltipProvider>
    </SessionProvider>
  );
}
