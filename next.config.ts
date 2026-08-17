import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Pages that moved. Handled here rather than as redirect-only page
      // files: no render, no bundle, and the whole set of moved URLs is
      // readable in one place.
      { source: "/home", destination: "/practice", permanent: true },
      { source: "/tasks/today", destination: "/practice", permanent: true },
      { source: "/tasks/progress", destination: "/progress", permanent: false },
      { source: "/tasks", destination: "/practice", permanent: false },
      { source: "/import", destination: "/dictionary", permanent: true },
      // Adding words stopped being its own screen: the box sits on top of the
      // list it fills, so the word you add is visible the moment it is added.
      { source: "/dictionary/add", destination: "/dictionary", permanent: false },

      // Section roots that are only a heading in the sidebar — send them to
      // the first page inside. /dictionary is a real page, so it is absent
      // here on purpose.
      { source: "/courses", destination: "/courses/grammar", permanent: false },

      // Vocabulary practice became the trainings grid.
      { source: "/practice/vocabulary", destination: "/practice", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
