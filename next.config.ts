import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/client"],
  async redirects() {
    return [
      // Pages that moved when the app grew into four sections. Handled here
      // rather than as redirect-only page files: no render, no bundle, and the
      // whole set of moved URLs is readable in one place.
      { source: "/home", destination: "/tasks/today", permanent: true },
      { source: "/import", destination: "/dictionary/add", permanent: true },

      // Section roots that are only a heading in the sidebar — send them to
      // the first page inside. /tasks and /dictionary are real pages, so they
      // are absent here on purpose.
      { source: "/practice", destination: "/practice/vocabulary", permanent: false },
      { source: "/courses", destination: "/courses/grammar", permanent: false },

      // The study player is the vocabulary trainer; it keeps its own URL
      // rather than being duplicated behind a second one.
      { source: "/practice/vocabulary", destination: "/study", permanent: false },
    ];
  },
};

export default nextConfig;
