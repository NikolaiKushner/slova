"use client";

import { useEffect } from "react";

import { TIMEZONE_COOKIE } from "@/lib/timezone";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Writes the browser's IANA zone so the server can count calendar days
 * in the learner's midnight, not Vercel's UTC.
 */
export function TimezoneCookie() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    document.cookie = `${TIMEZONE_COOKIE}=${zone}; Path=/; Max-Age=${YEAR}; SameSite=Lax`;
  }, []);
  return null;
}
