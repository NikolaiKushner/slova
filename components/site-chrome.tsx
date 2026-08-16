import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProseLink } from "@/components/prose-link";
import { CONTACT_EMAIL } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Marketing measure: 1120, fields 32 / 20. Shared by landing, legal, auth. */
export const MARKETING =
  "container-marketing w-full px-8 max-sm:px-5";

export function SiteHeader({
  action = "signIn",
}: {
  /** Complementary quiet link. Landing and most auth pages offer sign-in;
   *  the login page offers create-account instead, so the header is not a
   *  second copy of the form's own button. */
  action?: "signIn" | "register";
}) {
  const t = useTranslations("chrome");
  const href = action === "register" ? "/register" : "/login";
  const label = action === "register" ? t("createAccount") : t("signIn");

  return (
    <header className={cn(MARKETING, "flex items-center justify-between pt-6")}>
      <Link href="/" className="focus-ring inline-flex rounded-sm">
        <BrandWordmark className="text-2xl" />
      </Link>
      <div className="flex items-center gap-4">
        <LocaleSwitcher />
        <Link
          href={href}
          className="focus-ring rounded-sm text-sm text-foreground/80 transition-colors duration-(--motion-instant) hover:text-primary"
        >
          {label}
        </Link>
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
        dark ? "border-inverse-foreground/10" : "border-border",
      )}
    >
      <div
        className={cn(
          MARKETING,
          "flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <Link href="/" className="focus-ring inline-flex rounded-sm">
          <BrandWordmark
            className={cn("text-xl", dark && "text-inverse-foreground")}
            tone={dark ? "light" : "brand"}
          />
        </Link>
        <nav
          className={cn(
            "flex flex-wrap items-center gap-x-6 gap-y-2 text-sm",
            dark ? "text-inverse-muted" : "text-muted-foreground",
          )}
        >
          <Link
            href="/privacy"
            className={
              dark ? "hover:text-inverse-foreground" : "hover:text-foreground"
            }
          >
            {t("privacy")}
          </Link>
          <Link
            href="/terms"
            className={
              dark ? "hover:text-inverse-foreground" : "hover:text-foreground"
            }
          >
            {t("terms")}
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className={
              dark ? "hover:text-inverse-foreground" : "hover:text-foreground"
            }
          >
            {CONTACT_EMAIL}
          </a>
          <LocaleSwitcher tone={dark ? "dark" : "light"} />
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
