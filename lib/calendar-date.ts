import { TZDate } from "react-day-picker";

/** Interpret a YYYY-MM-DD key as noon in the learner's zone, not noon UTC. */
export function dateFromDayKey(key: string, timeZone: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new TZDate(year, month - 1, day, 12, 0, 0, timeZone);
}
