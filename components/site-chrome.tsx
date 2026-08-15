import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProseLink } from "@/components/prose-link";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";
import { cn } from "@/lib/utils";

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

/**
 * The site footer. On the landing it sits inside the closing forest band
 * (`tone="dark"`), so the page ends on one colour instead of a green band and
 * then a strip of mist under it.
 */
export function SiteFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  const t = useTranslations("chrome");
  const dark = tone === "dark";

  return (
    <footer
      className={cn(
        "mt-auto border-t",
        dark ? "border-primary-foreground/10" : "border-border",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex transition hover:opacity-80">
          <BrandWordmark
            className={cn("text-xl", dark && "text-primary-foreground")}
            tone={dark ? "light" : "brand"}
          />
        </Link>
        <nav
          className={cn(
            "flex flex-wrap items-center gap-x-6 gap-y-2 text-sm",
            dark ? "text-primary-foreground/65" : "text-muted-foreground",
          )}
        >
          <Link
            href="/privacy"
            className={dark ? "hover:text-primary-foreground" : "hover:text-foreground"}
          >
            {t("privacy")}
          </Link>
          <Link
            href="/terms"
            className={dark ? "hover:text-primary-foreground" : "hover:text-foreground"}
          >
            {t("terms")}
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className={dark ? "hover:text-primary-foreground" : "hover:text-foreground"}
          >
            {CONTACT_EMAIL}
          </a>
          <LocaleSwitcher className="-ml-2" tone={dark ? "dark" : "light"} />
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
        terms: (chunks) => <ProseLink href="/terms">{chunks}</ProseLink>,
        privacy: (chunks) => <ProseLink href="/privacy">{chunks}</ProseLink>,
      })}
    </p>
  );
}
