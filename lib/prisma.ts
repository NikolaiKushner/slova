import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the Neon connection string.",
    );
  }

  // Pooled WebSocket driver rather than the HTTP one: the review and undo
  // routes run real transactions, which HTTP cannot carry.
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

/**
 * Built on first call, not on import: a module that re-exports a pure helper
 * must not demand a database, which is what a build with no DATABASE_URL and
 * the unit tests both do.
 *
 * A plain function, deliberately — wrapping the client in a Proxy also defers
 * construction, but Auth.js inspects a client it is handed (checking methods,
 * iterating properties) and a Proxy answers those probes wrongly, which hangs
 * the request with no error to read.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
