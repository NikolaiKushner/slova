import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { inter, literata } from "@/app/fonts";
import { SITE_ORIGIN } from "@/lib/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // neutral-100, the application background. Kept as hex because the browser
  // chrome reads this before any stylesheet, so it cannot be a token.
  themeColor: "#F1F3F2",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  // Share card is Russian (hello → привет). Crawlers rarely send a locale
  // cookie, so the tags stay in step with the image rather than defaulting
  // to English.
  const og = await getTranslations({ locale: "ru", namespace: "meta" });
  const ogTitle = og("ogTitle");
  const ogDescription = og("ogDescription");

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: "/",
      siteName: "Slova",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Slova — hello → привет",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ["/og.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${literata.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: password managers / extensions inject attrs on body */}
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
