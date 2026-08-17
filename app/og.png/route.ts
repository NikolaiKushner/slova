import { renderOgImage } from "@/lib/og-image";

export const dynamic = "force-static";

/**
 * Canonical share image. First ship uses `/og.png`. Social caches last;
 * a later rewrite of the art goes out as `/og-v2.png`, not over this file.
 */
export async function GET() {
  return renderOgImage("dark");
}
