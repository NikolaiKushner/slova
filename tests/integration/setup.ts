import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.test.local", ".env.local", ".env"] });

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required. Integration tests never fall back to DATABASE_URL.",
  );
}

process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_UNPOOLED =
  process.env.TEST_DATABASE_URL_UNPOOLED ?? databaseUrl;
