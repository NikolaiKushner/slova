import type {
  Prisma,
  PrismaClient,
} from "@/app/generated/prisma/client";

const MAX_ATTEMPTS = 6;

export class RetryableTransactionConflict extends Error {
  constructor() {
    super("The learning state changed while the mutation was running.");
    this.name = "RetryableTransactionConflict";
  }
}

function prismaErrorCode(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return null;
  }
  return error.code;
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof RetryableTransactionConflict) return true;
  const code = prismaErrorCode(error);
  // P2034 is a serializable write conflict. P2002 can occur when two copies
  // of the same idempotent operation race to create its unique ledger row;
  // the retry observes that row and returns the already-persisted result.
  return code === "P2034" || code === "P2002";
}

export async function runSerializable<T>(
  prisma: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
        maxWait: 10_000,
        timeout: 20_000,
      });
    } catch (error) {
      if (!shouldRetry(error) || attempt >= MAX_ATTEMPTS) throw error;
    }
  }
}
