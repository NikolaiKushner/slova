import type { ReactNode } from "react";

import { Eyebrow } from "@/components/slova/eyebrow";
import { MARKETING, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { cn } from "@/lib/utils";

/**
 * The frame Privacy and Terms share.
 *
 * The reading column is anchored to the **left edge of the header grid**, not
 * centred in the window: a centred column under a full-width header lines up
 * with nothing, and the logo above it reads as belonging to another page. It
 * is also narrow on purpose — around 68 characters. These are the two pages on
 * the site meant to be read from top to bottom, and the landing's measure is
 * too wide for that.
 */
export function LegalPage({
  eyebrow,
  title,
  description,
  updated,
  effective,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  effective: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className={cn(MARKETING, "flex-1 pt-12 pb-24 lg:pt-16")}>
        <div className="max-w-[68ch]">
          <header className="mb-6">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="text-h1">{title}</h1>
            <p className="text-caption mt-2.5 flex flex-wrap items-center gap-2.5 text-muted-foreground">
              <span>{updated}</span>
              <span
                className="size-[3px] rounded-full bg-border"
                aria-hidden
              />
              <span>{effective}</span>
            </p>
            <p className="text-lead mt-5 text-foreground/80">{description}</p>
          </header>

          <div className="space-y-10">{children}</div>

          <div className="mt-11 flex flex-wrap items-center gap-6 border-t border-border pt-6 text-sm">
            {footer}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-overline text-eyebrow mb-3 border-b border-border pb-2.5">
        {title}
      </h2>
      <div className="space-y-3.5 text-[1.0625rem] leading-[1.6] text-foreground/80">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-2.5">{children}</ul>;
}

export function LegalItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-5 before:bg-primary/40 before:absolute before:top-[11px] before:left-0 before:size-1.5 before:rounded-full">
      {children}
    </li>
  );
}

export function legalRich() {
  return {
    strong: (chunks: ReactNode) => (
      <strong className="font-semibold text-foreground">{chunks}</strong>
    ),
  };
}
