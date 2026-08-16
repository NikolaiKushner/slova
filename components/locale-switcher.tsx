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
  variant = "pill",
}: {
  className?: string;
  /** `dark` is for the forest footer, where muted-foreground disappears. */
  tone?: "light" | "dark";
  /** `pill` on public chrome; `plain` in the user menu, where a capsule fights the row. */
  variant?: "pill" | "plain";
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

  const dark = tone === "dark";

  if (variant === "plain") {
    return (
      <div
        role="group"
        aria-label={t("switcher")}
        className={cn("flex items-center gap-0.5", className)}
      >
        {APP_LOCALES.map((code, index) => (
          <span key={code} className="flex items-center gap-0.5">
            {index > 0 ? (
              <span className="px-0.5 text-muted-foreground" aria-hidden>
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
                "h-8 min-w-8 px-1.5 text-sm tracking-wide",
                code === locale ? "font-semibold text-foreground" : "font-normal text-muted-foreground hover:text-foreground",
              )}
            >
              {t(code)}
            </Button>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("switcher")}
      className={cn(
        "flex overflow-hidden rounded-full border",
        dark
          ? "border-inverse-foreground/15 bg-inverse-foreground/5"
          : "border-border bg-card/60",
        className,
      )}
    >
      {APP_LOCALES.map((code) => {
        const on = code === locale;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-pressed={on}
            onClick={() => pick(code)}
            className={cn(
              "focus-ring min-h-9 px-3.5 text-[0.6875rem] font-semibold tracking-[0.1em] transition-colors duration-(--motion-instant)",
              dark
                ? on
                  ? "bg-inverse-foreground text-inverse-surface"
                  : "text-inverse-muted hover:text-inverse-foreground"
                : on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(code)}
          </button>
        );
      })}
    </div>
  );
}
