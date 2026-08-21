import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/**
 * The web app manifest — what «Добавить на экран „Домой"» makes of the site.
 *
 * Standalone, and that is the point rather than a badge: on an iPad, Safari's
 * tab bar and favourites bar take 100–150px off a window that a session with
 * the keyboard up is already short of. Installed, the session gets them back
 * without a line of layout code.
 *
 * iPadOS 26 turns any added site into a standalone app whether or not it has
 * a manifest. This is what decides the name, the icon and where it opens,
 * instead of letting the browser guess all three.
 */
/* Nothing here varies by request — the locale is named, not negotiated — and
   without this next-intl's request scope would make it a function call per
   install prompt. */
export const dynamic = "force-static";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Russian, like the share card and for the same reason: the interface is
  // Russian first, and the installed tile is read before any locale cookie.
  const t = await getTranslations({ locale: "ru", namespace: "meta" });

  return {
    name: "Slova",
    short_name: "Slova",
    description: t("description"),
    lang: "ru",
    // Not the study screen: signed out it would bounce through /login, and
    // «/» already sends a signed-in learner home.
    start_url: "/",
    display: "standalone",
    orientation: "any",
    // neutral-100, the same value the root layout gives the browser chrome.
    theme_color: "#F1F3F2",
    background_color: "#F1F3F2",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
