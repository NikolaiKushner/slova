# Plan: UI localisation (English + Russian)

**Date:** 2026-08-15 · **Branch:** `feat/i18n-ui` · **Status:** implemented
**Source:** add Russian to the public site and the signed-in app

## Problem

The product teaches English to Russian speakers, and much of the course content is already Russian — but the chrome (nav, landing, auth, buttons, empty states) is English-only. Fonts already load Cyrillic; there is no message catalog.

## Outcome

A visitor can use the whole UI in English or Russian. The choice is remembered. Teaching content stays as it is: English words and drills, Russian grammar explanations.

## Success criteria

- [x] Switching language changes landing, auth, legal, nav, and in-app chrome
- [x] Choice survives reload (cookie)
- [x] First visit without a cookie follows `Accept-Language` when it is `ru` or `en`
- [x] `html lang` matches the active locale
- [x] `en.json` and `ru.json` have the same keys
- [x] `npm test` stays green
- [x] Existing URLs (`/login`, `/tasks/today`, …) do not gain a `/en` or `/ru` prefix

## Non-goals

- Crowdin / Phrase / Lokalise (two languages, we write the copy)
- Locale in the URL (`/ru/login`) — would rewrite NextAuth, redirects, and every href
- Storing locale on `User` (cookie is enough; a settings field can come later)
- Translating English teaching material (exercise prompts, word fronts, grammar examples)
- More than two UI locales

## Context found in the codebase

- No i18n layer. Copy lives in pages and components.
- `lib/languages.ts` is the **study pair** (English word → Russian translation), not UI locale. Keep them apart.
- NextAuth already owns `middleware.ts`. A `[locale]` segment would have to compose with that matcher.
- Course JSON already has `titleRu` and Russian explanations (`content/courses`).
- An older plan (`plans/sections-core-dictionary.md`) deferred UI i18n; this replaces that decision.
- Source Sans 3 already subsets Cyrillic. Fraunces on the root layout does not yet.

## Design

**Chosen: next-intl + JSON files, no URL prefix.** Cookie `locale` (`en` | `ru`), then `Accept-Language`, then `en`. `NextIntlClientProvider` in the root layout. A compact EN · RU switcher on the public header and in the account menu.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| A (chosen) next-intl, files, cookie | Messages in `messages/{en,ru}.json` | No unique URL per language (weaker public SEO) | chosen: smallest blast radius with NextAuth |
| B next-intl + `/en` `/ru` prefixes | `[locale]` segment + composed middleware | Rewrites every path, redirect, and auth callback | rejected: cost is the routing, not the copy |
| C Crowdin / Phrase / Lokalise | TMS + API at runtime or CI pull | Extra vendor, env, and workflow for ~200 strings | rejected: we own both languages |

**What would change this decision:** a third locale, or a translator who is not in this repo.

**Touches:** UI · deps (`next-intl`) · cookie · emails. No Prisma migration.

## Steps

### 1. Install next-intl and resolve locale — S · `[x]`

- **Files:** `i18n/request.ts`, `lib/i18n/locale.ts`, `lib/i18n/set-locale.ts`, `global.ts`, `next.config.ts`, `app/layout.tsx`
- **Does:** cookie + Accept-Language, `html lang`, provider
- **Verify:** unit tests for `negotiateLocale`; `npm test`

### 2. Message catalogs and switcher — M · `[ ]`

- **Files:** `messages/en.json`, `messages/ru.json`, `components/locale-switcher.tsx`
- **Verify:** key-parity test between the two JSON files

### 3. Public site, auth, legal, emails — M · `[ ]`

- **Files:** landing, site chrome, auth forms/pages, privacy/terms, `lib/auth-email.ts`, auth error codes
- **Verify:** `tests/unit/auth-email.test.ts` still finds the link in both bodies

### 4. App chrome and sessions — L · `[ ]`

- **Files:** nav, sidebar, search, today, dictionary, practice, courses, study, coming-soon pages, API errors shown in the UI
- **Verify:** `tests/unit/nav.test.ts`, `progress.test.ts`, `study-queue.test.ts`

## Risks

| Risk | Early signal | Cheapest way to resolve it now |
|---|---|---|
| next-intl + NextAuth middleware fight | build / login redirect loop | no i18n routing, leave middleware as-is |
| Missing keys at runtime | next-intl throws in dev | key-parity test + typed `en.json` |
| Confusing UI locale with study pair | dictionary columns translated into “UI language” | keep `lib/languages.ts` as EN→RU content; only labels translate |

## Rollback

Remove `next-intl`, the cookie, and the catalogs. No migration to reverse.

## Test plan

- Unit: locale negotiation, JSON key parity, existing auth/nav/progress tests
- Deliberately untested in this branch: browser click-through of the switcher (CI e2e)

## Deferred / out of scope

- Persist locale on `User`
- hreflang / prefixed public URLs for SEO
- Translating shadcn primitive chrome beyond what the product surfaces
