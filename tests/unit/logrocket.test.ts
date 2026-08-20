import { describe, expect, it } from "vitest";

import {
  logRocketAppId,
  sanitizeRequest,
  sanitizeResponse,
} from "@/lib/logrocket";

const APP_ID = "xajink/slova";

describe("logRocketAppId", () => {
  it("records in production when the app id is set", () => {
    expect(logRocketAppId({ nodeEnv: "production", appId: APP_ID })).toBe(
      APP_ID,
    );
  });

  it("stays silent in development even with an app id", () => {
    expect(logRocketAppId({ nodeEnv: "development", appId: APP_ID })).toBeNull();
    expect(logRocketAppId({ nodeEnv: "test", appId: APP_ID })).toBeNull();
  });

  /**
   * A missing or blank variable must degrade to "no recording". Failing the
   * deploy instead would make an optional diagnostic tool able to take the
   * application down, which is the wrong trade.
   */
  it("stays silent when the app id is missing or blank", () => {
    expect(logRocketAppId({ nodeEnv: "production" })).toBeNull();
    expect(logRocketAppId({ nodeEnv: "production", appId: "" })).toBeNull();
    expect(logRocketAppId({ nodeEnv: "production", appId: "   " })).toBeNull();
  });
});

describe("network sanitizers", () => {
  it("drops auth requests whole, relative or absolute", () => {
    expect(
      sanitizeRequest({ url: "/api/auth/session", headers: {} }),
    ).toBeNull();
    expect(
      sanitizeRequest({
        url: "https://slova.study/api/auth/callback/credentials",
        headers: {},
      }),
    ).toBeNull();
  });

  it("drops the auth response as well as the request", () => {
    expect(
      sanitizeResponse({ url: "/api/auth/csrf", headers: {} }),
    ).toBeNull();
  });

  /**
   * A query string must not make an auth route look like something else: the
   * decision is taken on the path only.
   */
  it("drops auth requests carrying a query string", () => {
    expect(
      sanitizeRequest({
        url: "/api/auth/callback/google?code=secret",
        headers: {},
      }),
    ).toBeNull();
  });

  it("strips credentials from an ordinary request but keeps the body", () => {
    const sanitized = sanitizeRequest({
      url: "https://slova.study/api/words",
      headers: {
        Authorization: "Bearer token",
        Cookie: "authjs.session-token=abc",
        "Content-Type": "application/json",
      },
      body: '{"word":"hello"}',
    });

    expect(sanitized).not.toBeNull();
    expect(sanitized?.headers).toEqual({ "Content-Type": "application/json" });
    expect(sanitized?.body).toBe('{"word":"hello"}');
  });

  it("strips Set-Cookie from an ordinary response", () => {
    const sanitized = sanitizeResponse({
      url: "/api/study/queue",
      headers: { "set-cookie": "authjs.session-token=abc", "x-request-id": "1" },
    });

    expect(sanitized?.headers).toEqual({ "x-request-id": "1" });
  });

  it("keeps a request LogRocket hands over without a parsable url", () => {
    expect(sanitizeRequest({ url: "", headers: {} })).not.toBeNull();
  });
});
