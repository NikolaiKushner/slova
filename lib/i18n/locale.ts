/**
 * UI locale — English or Russian chrome — not the study pair in
 * `lib/languages.ts` (English word, Russian translation).
 */

export const APP_LOCALES = ["en", "ru"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const LOCALE_COOKIE = "locale";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "en" || value === "ru";
}

/**
 * Cookie wins (they picked it). Otherwise the browser's language list, then
 * English — the language the UI was written in, so a first visit from an
 * unknown locale does not surprise anyone who already knows the app.
 */
export function negotiateLocale(
  cookie: string | undefined | null,
  acceptLanguage: string | undefined | null,
): AppLocale {
  if (isAppLocale(cookie)) return cookie;
  return localeFromAcceptLanguage(acceptLanguage);
}

export function localeFromAcceptLanguage(
  header: string | undefined | null,
): AppLocale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.trim().slice(2)) : 1;
      return { tag: (tag ?? "").trim().toLowerCase(), quality };
    })
    .filter((item) => item.tag && Number.isFinite(item.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isAppLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}
