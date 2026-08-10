/**
 * Preflight for a deploy. Runs before migrations, so a missing variable fails
 * in a second with its own name in the message, instead of surfacing later as
 * "The datasource.url property is required" or, at runtime, as NextAuth's
 * "There is a problem with the server configuration".
 */

const REQUIRED = {
  DATABASE_URL:
    "Neon connection string. Vercel → Storage → Neon sets this; check the name is exactly DATABASE_URL, not POSTGRES_URL.",
  AUTH_SECRET: "openssl rand -base64 32",
  AUTH_GOOGLE_ID: "Google Cloud Console → Credentials → OAuth client (Web).",
  AUTH_GOOGLE_SECRET: "Same OAuth client as AUTH_GOOGLE_ID.",
};

const missing = Object.keys(REQUIRED).filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `\nMissing ${missing.length} required environment variable${
      missing.length === 1 ? "" : "s"
    }:\n`,
  );
  for (const key of missing) {
    console.error(`  ${key}\n    ${REQUIRED[key]}\n`);
  }
  console.error("Set them in the Vercel project, then redeploy.\n");
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  console.error(
    `\nDATABASE_URL is not a Postgres URL (got "${process.env.DATABASE_URL.slice(
      0,
      12,
    )}…").\nThis app moved off SQLite — a file: URL cannot work on serverless.\n`,
  );
  process.exit(1);
}

console.log("Environment looks complete.");
