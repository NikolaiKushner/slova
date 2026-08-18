import { isIP } from "node:net";

/**
 * Vercel normalizes the forwarding chain. Accept only a real address so a
 * malformed or attacker-supplied header cannot create unbounded limiter keys.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded =
    headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "";
  return isIP(candidate) ? candidate : "unknown";
}
