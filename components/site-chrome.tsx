import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";

export function SiteHeader() {
  const t = useTranslations("chrome");

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="inline-flex transition hover:opacity-80">
        <BrandWordmark className="text-3xl" />
      </Link>
      <div className="flex items-center gap-1">
        <LocaleSwitcher />
        <Button variant="ghost" size="lg" render={<Link href="/login" />}>
          {t("signIn")}
        </Button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useTranslations("chrome");

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex transition hover:opacity-80">
          <BrandWordmark className="text-xl" />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
          <LocaleSwitcher className="-ml-2" />
        </nav>
      </div>
    </footer>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  const t = useTranslations("chrome");

  return (
    <p className={className}>
      {t.rich("agree", {
        terms: (chunks) => (
          <Link
            href="/terms"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link
            href="/privacy"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
