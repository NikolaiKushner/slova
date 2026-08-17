/**
 * Calendar days in the learner's IANA zone — not the Node process, which on
 * Vercel is UTC and would roll a UTC+4 streak over at 04:00.
 */

export const TIMEZONE_COOKIE = "tz";
export const DEFAULT_TIMEZONE = "UTC";

const TIMEZONE_MAX_LENGTH = 80;

/** IANA name from a cookie (or anything else untrusted). Junk becomes UTC. */
export function readTimeZone(value: string | undefined | null): string {
  if (!value) return DEFAULT_TIMEZONE;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > TIMEZONE_MAX_LENGTH) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat("en-CA", { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Local calendar day of a timestamp in an IANA zone, as YYYY-MM-DD.
 * Unknown zones fall back to UTC rather than throwing.
 */
export function calendarDay(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const zone = readTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

/** Shift a YYYY-MM-DD key by whole calendar days. DST-safe: date math in UTC. */
export function shiftCalendarDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + delta));
  return calendarDay(shifted, DEFAULT_TIMEZONE);
}
