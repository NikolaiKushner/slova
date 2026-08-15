"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { APP_LOCALES, type AppLocale } from "@/lib/i18n/locale";
import { setLocale } from "@/lib/i18n/set-locale";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({
  className,
  tone = "light",
}: {
  className?: string;
  /** `dark` is for the forest footer, where muted-foreground disappears. */
  tone?: "light" | "dark";
}) {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(next: AppLocale) {
    if (next === locale) return;
    start(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("switcher")}
      className={cn("flex items-center gap-0.5", className)}
    >
      {APP_LOCALES.map((code, index) => (
        <span key={code} className="flex items-center gap-0.5">
          {index > 0 ? (
            <span
              className={cn(
                "px-0.5",
                tone === "dark"
                  ? "text-primary-foreground/40"
                  : "text-muted-foreground",
              )}
              aria-hidden
            >
              ·
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-pressed={code === locale}
            onClick={() => pick(code)}
            className={cn(
              // Weight, not just colour: in the header the active language sits
              // next to Sign in, which is the same ink, so colour alone stopped
              // reading as a state there while it read fine in the footer.
              "h-8 min-w-8 px-1.5 text-sm tracking-wide",
              code === locale ? "font-semibold" : "font-normal",
              tone === "dark"
                ? code === locale
                  ? "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                : code === locale
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(code)}
          </Button>
        </span>
      ))}
    </div>
  );
}
