import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-static";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: "ru", namespace: "meta" });

  return {
    name: "Slova",
    short_name: "Slova",
    description: t("description"),
    lang: "ru",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#F1F3F2",
    background_color: "#F1F3F2",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
