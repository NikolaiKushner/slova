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
  ANTHROPIC_API_KEY:
    "console.anthropic.com → API keys. Without it the translate route fails per request, at the one moment a user is watching.",
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

// AUTH_URL becomes the OAuth redirect_uri. A stray character here is invisible
// until Google answers redirect_uri_mismatch, so check the shape here instead.
const authUrl = process.env.AUTH_URL;
if (authUrl) {
  let parsed;
  try {
    parsed = new URL(authUrl);
  } catch {
    console.error(`\nAUTH_URL is not a URL: "${authUrl}"\n`);
    process.exit(1);
  }

  const problems = [];
  if (parsed.hostname.endsWith(".")) {
    problems.push(
      "the hostname ends in a dot — a trailing '.' pasted from prose makes Google reject the callback as redirect_uri_mismatch",
    );
  }
  if (parsed.pathname !== "/") {
    problems.push("it has a path; AUTH_URL is an origin, not a page");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    problems.push("it is not https, and Google only accepts https off localhost");
  }

  if (problems.length > 0) {
    console.error(`\nAUTH_URL is malformed ("${authUrl}"):\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    const fixed = `${parsed.protocol}//${parsed.hostname.replace(/\.+$/, "")}${
      parsed.port ? `:${parsed.port}` : ""
    }`;
    console.error(
      `\nAUTH_URL should read ${fixed}, and Google must have\n${fixed}/api/auth/callback/google as an authorised redirect URI.\n`,
    );
    process.exit(1);
  }
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
