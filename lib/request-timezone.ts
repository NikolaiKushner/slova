import { cookies } from "next/headers";

import { readTimeZone, TIMEZONE_COOKIE } from "@/lib/timezone";

export async function requestTimeZone(): Promise<string> {
  const store = await cookies();
  return readTimeZone(store.get(TIMEZONE_COOKIE)?.value);
}
