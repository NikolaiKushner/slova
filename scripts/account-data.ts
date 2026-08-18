import { writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"] });

import {
  deleteAccountData,
  exportAccountData,
  planAccountDeletion,
} from "@/lib/account-data";
import { getPrisma } from "@/lib/prisma";

type Options = Record<string, string | boolean>;

function parseArguments(args: string[]) {
  const command = args.shift();
  if (command !== "export" && command !== "delete") {
    throw new Error("Usage: account:data <export|delete> --email <email> [options]");
  }
  const options: Options = {};
  while (args.length > 0) {
    const flag = args.shift()!;
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const name = flag.slice(2);
    if (name === "execute" || name === "overwrite") {
      options[name] = true;
      continue;
    }
    const value = args.shift();
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }
    options[name] = value;
  }
  return { command, options };
}

function required(options: Options, name: string) {
  const value = options[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`--${name} is required.`);
  }
  return value.trim();
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  const directUrl = process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!directUrl) {
    throw new Error("DATABASE_URL_UNPOOLED is required for account operations.");
  }
  process.env.DATABASE_URL = directUrl;
  const prisma = getPrisma();
  const email = required(options, "email");

  try {
    if (command === "export") {
      const output = path.resolve(required(options, "output"));
      const repositoryRoot = `${process.cwd()}${path.sep}`;
      if (output === process.cwd() || output.startsWith(repositoryRoot)) {
        throw new Error("Account exports must be written outside the repository.");
      }
      const data = await exportAccountData(prisma, email);
      await writeFile(output, `${JSON.stringify(data, null, 2)}\n`, {
        encoding: "utf8",
        flag: options.overwrite ? "w" : "wx",
        mode: 0o600,
      });
      console.log(`Account export written to ${output}`);
      return;
    }

    const plan = await planAccountDeletion(prisma, email);
    console.log(JSON.stringify(plan, null, 2));
    if (!options.execute) {
      console.log("Dry run only. Add --execute --confirm <normalized-email> to delete.");
      return;
    }
    const result = await deleteAccountData(
      prisma,
      email,
      required(options, "confirm"),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
