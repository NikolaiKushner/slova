import { describe, expect, it, vi } from "vitest";

import {
  RetryableTransactionConflict,
  runSerializable,
} from "@/lib/serializable-transaction";
import type { PrismaClient } from "@/app/generated/prisma/client";

/** A Prisma client whose $transaction just runs the callback. */
function clientOver(results: (() => unknown)[]): PrismaClient {
  let call = 0;
  return {
    async $transaction(operation: (tx: unknown) => Promise<unknown>) {
      const step = results[Math.min(call, results.length - 1)];
      call += 1;
      const outcome = step();
      if (outcome instanceof Error) throw outcome;
      return operation({});
    },
  } as unknown as PrismaClient;
}

function prismaError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

const SERIALIZATION_FAILURE = prismaError(
  "P2010",
  "Raw query failed. Code: `40001`. Message: `could not serialize access due to read/write dependencies among transactions`",
);

describe("runSerializable", () => {
  it("retries a raw serialization failure", async () => {
    const operation = vi.fn().mockResolvedValue("done");
    const prisma = clientOver([() => SERIALIZATION_FAILURE, () => null]);

    await expect(runSerializable(prisma, operation)).resolves.toBe("done");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries a raw deadlock", async () => {
    const deadlock = prismaError(
      "P2010",
      "Raw query failed. Code: `40P01`. Message: `deadlock detected`",
    );
    const prisma = clientOver([() => deadlock, () => null]);
    await expect(
      runSerializable(prisma, vi.fn().mockResolvedValue("done")),
    ).resolves.toBe("done");
  });

  it("retries the codes the query builder reports", async () => {
    for (const code of ["P2034", "P2002"]) {
      const prisma = clientOver([() => prismaError(code, "conflict"), () => null]);
      await expect(
        runSerializable(prisma, vi.fn().mockResolvedValue("done")),
      ).resolves.toBe("done");
    }
  });

  it("retries an explicit optimistic-guard conflict", async () => {
    const prisma = clientOver([
      () => new RetryableTransactionConflict(),
      () => null,
    ]);
    await expect(
      runSerializable(prisma, vi.fn().mockResolvedValue("done")),
    ).resolves.toBe("done");
  });

  it("does not retry a raw query that failed for its own reasons", async () => {
    const broken = prismaError(
      "P2010",
      "Raw query failed. Code: `42703`. Message: `column \"nope\" does not exist`",
    );
    const prisma = clientOver([() => broken]);
    await expect(
      runSerializable(prisma, vi.fn().mockResolvedValue("done")),
    ).rejects.toThrow("42703");
  });

  it("gives up rather than retrying forever", async () => {
    const prisma = clientOver([() => SERIALIZATION_FAILURE]);
    await expect(
      runSerializable(prisma, vi.fn().mockResolvedValue("done")),
    ).rejects.toThrow("40001");
  });
});
