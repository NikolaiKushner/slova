"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { APP_LOCALES, type AppLocale } from "@/lib/i18n/locale";
import { setLocale } from "@/lib/i18n/set-locale";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
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
              code === locale
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
