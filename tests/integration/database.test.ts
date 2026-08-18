import { afterAll, expect, test } from "vitest";

import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

afterAll(async () => {
  await prisma.$disconnect();
});

test("the isolated database is reachable and migrated", async () => {
  const result = await prisma.$queryRaw<Array<{ userTable: string | null }>>`
    SELECT to_regclass('public."User"')::text AS "userTable"
  `;

  expect(result).toEqual([{ userTable: '"User"' }]);
});
