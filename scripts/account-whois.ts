import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"] });

import { getPrisma } from "@/lib/prisma";
import { parseWhoisTarget } from "@/scripts/whois-target";

/**
 * Resolves a LogRocket session's user id to the account behind it, or an
 * address to the id LogRocket knows it by. Read-only: it selects four columns
 * and writes nothing. Deletion and export stay in `account:data`.
 */
async function main() {
  const target = parseWhoisTarget(process.argv.slice(2));
  const directUrl = process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!directUrl) {
    throw new Error("DATABASE_URL_UNPOOLED is required for account lookups.");
  }
  process.env.DATABASE_URL = directUrl;

  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: target.by === "id" ? { id: target.id } : { email: target.email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    if (!user) {
      const shown = target.by === "id" ? target.id : target.email;
      console.error(`No account matches ${shown}.`);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(user, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
