import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.test.local", ".env.local", ".env"] });

import { getPrisma } from "@/lib/prisma";
import { seedTestUserFixture } from "@/scripts/test-user-fixture";
import { resolveTestUserEnvironment } from "@/scripts/test-user-env";

let prisma: ReturnType<typeof getPrisma> | null = null;

async function main() {
  const environment = resolveTestUserEnvironment(process.env);
  process.env.DATABASE_URL = environment.databaseUrl;
  if (environment.databaseUrlUnpooled) {
    process.env.DATABASE_URL_UNPOOLED = environment.databaseUrlUnpooled;
  }

  prisma = getPrisma();
  const summary = await seedTestUserFixture(prisma, environment);
  console.log(
    `Reset E2E fixture for ${summary.email}: ${summary.sets} sets, ${summary.words} words, ${summary.lessons} lessons.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
