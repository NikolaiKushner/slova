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

/** SQLSTATE 40001 serialization failure / 40P01 deadlock, as Postgres reports. */
const SERIALIZATION_SQLSTATE = /\b(40001|40P01)\b/;

function shouldRetry(error: unknown): boolean {
  if (error instanceof RetryableTransactionConflict) return true;
  const code = prismaErrorCode(error);
  // P2034 is a serializable write conflict. P2002 can occur when two copies
  // of the same idempotent operation race to create its unique ledger row;
  // the retry observes that row and returns the already-persisted result.
  if (code === "P2034" || code === "P2002") return true;
  /*
   * P2010 is "raw query failed" — Prisma does not translate the SQLSTATE for
   * a `$executeRaw`, so the same serialization failure that arrives as P2034
   * from the query builder arrives here as an untyped error carrying 40001.
   * `persistTouch` is raw SQL, and two answers in flight at once land on the
   * same StudySitting row; without this the second one 500s instead of
   * retrying, and the learner sees "Connection interrupted".
   */
  if (code === "P2010") {
    return SERIALIZATION_SQLSTATE.test(String((error as Error).message ?? ""));
  }
  return false;
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
