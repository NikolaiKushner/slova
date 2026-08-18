import {
  isEmail,
  normalizeEmail,
  passwordIssue,
} from "@/lib/password-rules";

const TEST_ENVIRONMENTS = new Set([
  "local",
  "test",
  "preview",
  "staging",
  "ci",
  "production",
]);

export type TestDatabaseEnvironment = {
  databaseUrl: string;
  databaseUrlUnpooled?: string;
  databaseEnvironment: string;
  allowsProduction: boolean;
};

export type TestUserEnvironment = TestDatabaseEnvironment & {
  email: string;
  password: string;
};

type Environment = Readonly<Record<string, string | undefined>>;

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function databaseLooksLikeProduction(databaseUrl: string): boolean {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection URL.");
  }

  const labels = [
    url.hostname,
    url.pathname,
    url.searchParams.get("branch") ?? "",
    url.searchParams.get("database") ?? "",
  ];
  return labels.some((label) =>
    /(^|[./_-])(prod|production)([./_-]|$)/i.test(label),
  );
}

function resolveDatabaseEnvironment(
  env: Environment,
  permitProductionOverride: boolean,
): TestDatabaseEnvironment {
  const databaseUrl = required(env, "TEST_DATABASE_URL");
  const databaseEnvironment = required(
    env,
    "TEST_DATABASE_ENVIRONMENT",
  ).toLowerCase();
  const allowsProduction = env.E2E_ALLOW_PRODUCTION_SEED === "true";

  if (!TEST_ENVIRONMENTS.has(databaseEnvironment)) {
    throw new Error(
      "TEST_DATABASE_ENVIRONMENT must be local, test, preview, staging, ci, or production.",
    );
  }
  const productionTarget =
    databaseEnvironment === "production" ||
    env.VERCEL_ENV === "production" ||
    databaseLooksLikeProduction(databaseUrl);
  if (productionTarget && !permitProductionOverride) {
    throw new Error(
      "Refusing to migrate or prepare a production-looking database.",
    );
  }
  if (productionTarget && !allowsProduction) {
    throw new Error(
      "Refusing to seed a production-looking database. Set E2E_ALLOW_PRODUCTION_SEED=true only after explicit approval.",
    );
  }

  return {
    databaseUrl,
    databaseUrlUnpooled: env.TEST_DATABASE_URL_UNPOOLED?.trim() || undefined,
    databaseEnvironment,
    allowsProduction,
  };
}

export function resolveTestDatabaseEnvironment(
  env: Environment,
): TestDatabaseEnvironment {
  return resolveDatabaseEnvironment(env, false);
}

export function resolveTestUserEnvironment(
  env: Environment,
): TestUserEnvironment {
  const database = resolveDatabaseEnvironment(env, true);
  const email = normalizeEmail(required(env, "E2E_TEST_USER_EMAIL"));
  const password = env.E2E_TEST_USER_PASSWORD;
  if (!password) throw new Error("E2E_TEST_USER_PASSWORD is required.");
  if (!isEmail(email)) throw new Error("E2E_TEST_USER_EMAIL is invalid.");

  const issue = passwordIssue(password);
  if (issue === "passwordTooShort") {
    throw new Error("E2E_TEST_USER_PASSWORD is too short.");
  }
  if (issue === "passwordTooLong") {
    throw new Error("E2E_TEST_USER_PASSWORD is too long.");
  }

  return { ...database, email, password };
}
