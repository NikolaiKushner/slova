import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * LogRocket publishes its recorder through a rotation of ingest hosts and falls
 * back across them when one is blocked, so the policy has to name the whole set
 * rather than the one host seen in a browser today.
 * https://docs.logrocket.com/docs/troubleshooting-sessions
 */
const LOGROCKET_HOSTS = [
  "logrocket.io",
  "lr-ingest.io",
  "lr-in.com",
  "lr-in-prod.com",
  "lr-ingest.com",
  "ingest-lr.com",
  "lr-intake.com",
  "intake-lr.com",
  "logr-ingest.com",
  "lrkt-in.com",
  "lgrckt-in.com",
  "logr-in.com",
];
const logRocketScriptSrc = LOGROCKET_HOSTS.map((host) => `https://cdn.${host}`);
const logRocketConnectSrc = [
  ...LOGROCKET_HOSTS.map((host) => `https://*.${host}`),
  "https://*.logrocket.com",
];

const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  `script-src 'self' https://va.vercel-scripts.com ${logRocketScriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.vercel-insights.com ${logRocketConnectSrc.join(" ")}`,
  "media-src 'self' blob: https:",
  // The LogRocket recorder runs in a worker created from a blob. Safari below
  // 15.5 ignores worker-src, which is why child-src carries the same value.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/security/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
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
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=604800; includeSubDomains",
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
