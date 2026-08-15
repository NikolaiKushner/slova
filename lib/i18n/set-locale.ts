"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  LOCALE_COOKIE,
  isAppLocale,
  type AppLocale,
} from "@/lib/i18n/locale";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocale(locale: AppLocale) {
  if (!isAppLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
