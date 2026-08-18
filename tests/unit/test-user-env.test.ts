import { describe, expect, test } from "vitest";

import {
  resolveTestDatabaseEnvironment,
  resolveTestUserEnvironment,
} from "@/scripts/test-user-env";

const base = {
  TEST_DATABASE_URL:
    "postgresql://test:secret@test-pooler.example.com/slova_test?sslmode=require",
  TEST_DATABASE_ENVIRONMENT: "test",
  E2E_TEST_USER_EMAIL: " learner@example.test ",
  E2E_TEST_USER_PASSWORD: "correct-horse-battery-staple",
};

describe("test user seed environment", () => {
  test("accepts and normalizes an isolated test configuration", () => {
    expect(resolveTestUserEnvironment(base)).toMatchObject({
      databaseEnvironment: "test",
      email: "learner@example.test",
      allowsProduction: false,
    });
  });

  test("never falls back to DATABASE_URL", () => {
    expect(() =>
      resolveTestUserEnvironment({
        ...base,
        TEST_DATABASE_URL: undefined,
        DATABASE_URL: base.TEST_DATABASE_URL,
      }),
    ).toThrow("TEST_DATABASE_URL is required");
  });

  test("refuses an explicitly production environment", () => {
    expect(() =>
      resolveTestUserEnvironment({
        ...base,
        TEST_DATABASE_ENVIRONMENT: "production",
      }),
    ).toThrow("Refusing to seed a production-looking database");
  });

  test("refuses a production-looking connection URL", () => {
    expect(() =>
      resolveTestUserEnvironment({
        ...base,
        TEST_DATABASE_URL:
          "postgresql://test:secret@prod.example.com/slova?sslmode=require",
      }),
    ).toThrow("Refusing to seed a production-looking database");
  });

  test("requires the explicit production override", () => {
    expect(
      resolveTestUserEnvironment({
        ...base,
        TEST_DATABASE_ENVIRONMENT: "production",
        E2E_ALLOW_PRODUCTION_SEED: "true",
      }).allowsProduction,
    ).toBe(true);
  });

  test("never permits test migrations against production", () => {
    expect(() =>
      resolveTestDatabaseEnvironment({
        ...base,
        TEST_DATABASE_ENVIRONMENT: "production",
        E2E_ALLOW_PRODUCTION_SEED: "true",
      }),
    ).toThrow("Refusing to migrate or prepare a production-looking database");
  });
});
