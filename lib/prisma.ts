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

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Built on first use, not on import. Importing a module that merely re-exports
 * a pure helper must not demand a database — that is what a build with no
 * DATABASE_URL does, and what the unit tests do.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    // $transaction and friends need their receiver.
    return typeof value === "function" ? value.bind(client) : value;
  },
});
