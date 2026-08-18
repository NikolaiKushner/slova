import { TZDate } from "react-day-picker";

/** Interpret a YYYY-MM-DD key at a wall-clock hour in the learner's zone. */
export function dateFromDayKey(
  key: string,
  timeZone: string,
  hour = 12,
): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new TZDate(year, month - 1, day, hour, 0, 0, timeZone);
}
