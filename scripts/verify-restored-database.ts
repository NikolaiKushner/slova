import { config as loadEnv } from "dotenv";

const useTestEnvironment = process.argv.includes("--test-environment");
loadEnv({
  path: useTestEnvironment
    ? [".env.test.local", ".env.local", ".env"]
    : [".env.local", ".env"],
});

import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

function required(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
}

async function main() {
  const databaseUrl = required(
    useTestEnvironment ? "TEST_DATABASE_URL" : "RESTORE_DATABASE_URL",
    useTestEnvironment
      ? process.env.TEST_DATABASE_URL
      : process.env.RESTORE_DATABASE_URL,
  );
  const unpooledUrl = required(
    useTestEnvironment
      ? "TEST_DATABASE_URL_UNPOOLED"
      : "RESTORE_DATABASE_URL_UNPOOLED",
    useTestEnvironment
      ? process.env.TEST_DATABASE_URL_UNPOOLED
      : process.env.RESTORE_DATABASE_URL_UNPOOLED,
  );
  const environment = required(
    useTestEnvironment
      ? "TEST_DATABASE_ENVIRONMENT"
      : "RESTORE_DATABASE_ENVIRONMENT",
    useTestEnvironment
      ? process.env.TEST_DATABASE_ENVIRONMENT
      : process.env.RESTORE_DATABASE_ENVIRONMENT,
  ).toLowerCase();
  if (environment === "production") {
    throw new Error("Restore verification must target an isolated branch, not production.");
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_URL_UNPOOLED = unpooledUrl;
  const prisma = getPrisma();
  try {
    const [database, migrations, users, words, sets, reviews] = await Promise.all([
      prisma.$queryRaw<Array<{ database: string; schema: string }>>(Prisma.sql`
        SELECT current_database()::text AS database, current_schema()::text AS schema
      `),
      prisma.$queryRaw<Array<{ applied: number; failed: number }>>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE "finished_at" IS NOT NULL)::int AS applied,
          COUNT(*) FILTER (WHERE "finished_at" IS NULL)::int AS failed
        FROM "_prisma_migrations"
      `),
      prisma.user.count(),
      prisma.userWord.count(),
      prisma.wordSet.count(),
      prisma.reviewLog.count(),
    ]);
    const migrationState = migrations[0];
    if (!migrationState || migrationState.applied === 0 || migrationState.failed > 0) {
      throw new Error("Restored database does not have a complete Prisma migration history.");
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          environment,
          database: database[0],
          migrations: migrationState,
          readableRows: { users, words, sets, reviews },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
