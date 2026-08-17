"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimezoneCookie } from "@/components/timezone-cookie";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TimezoneCookie />
      <TooltipProvider>{children}</TooltipProvider>
    </SessionProvider>
  );
}
