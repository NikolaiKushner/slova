import type { ReactNode } from "react";

import { MARKETING, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Eyebrow } from "@/components/slova/eyebrow";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card py-8 shadow-card">
      <CardHeader className="gap-2">
        <Eyebrow className="mb-0">{eyebrow}</Eyebrow>
        <h2 className="text-h1">{title}</h2>
        <p className="text-lead text-foreground/80">{description}</p>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

/**
 * One centred column under the public header. Login, register, and the
 * password/email errands share it — the form is the page, not a panel beside
 * a still.
 */
export function AuthNarrow({
  headerAction = "signIn",
  children,
}: {
  headerAction?: "signIn" | "register";
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader action={headerAction} />
      <div
        className={cn(
          MARKETING,
          "flex flex-1 flex-col items-center pt-12 pb-20 lg:pt-16",
        )}
      >
        <div className="w-full max-w-md">{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
