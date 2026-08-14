import Link from "next/link";

import { BrandWordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="inline-flex transition hover:opacity-80">
        <BrandWordmark className="text-3xl" />
      </Link>
      <Button variant="ghost" size="lg" render={<Link href="/login" />}>
        Sign in
      </Button>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex transition hover:opacity-80">
          <BrandWordmark className="text-xl" />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      By continuing you agree to the{" "}
      <Link href="/terms" className="text-foreground underline-offset-4 hover:underline">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
        Privacy
      </Link>
      .
    </p>
  );
}
