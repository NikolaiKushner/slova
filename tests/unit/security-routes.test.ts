import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as cleanup } from "@/app/api/cron/cleanup/route";
import { POST as reportCsp } from "@/app/api/security/csp-report/route";

const originalCronSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
  vi.restoreAllMocks();
});

describe("security machine routes", () => {
  it("rejects cleanup requests without the cron bearer secret", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const response = await cleanup(new Request("https://slova.test/api/cron/cleanup"));
    expect(response.status).toBe(401);
  });

  it("accepts a bounded CSP report and logs only allow-listed fields", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await reportCsp(new Request(
      "https://slova.test/api/security/csp-report",
      {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: JSON.stringify({
          "csp-report": {
            "document-uri": "https://slova.study/",
            "violated-directive": "script-src",
            "blocked-uri": "inline",
            "script-sample": "private content must not reach logs",
          },
        }),
      },
    ));

    expect(response.status).toBe(204);
    const event = JSON.parse(String(warning.mock.calls[0]?.[0]));
    expect(event).toMatchObject({
      event: "security.csp.violation",
      violatedDirective: "script-src",
      blockedUri: "inline",
    });
    expect(JSON.stringify(event)).not.toContain("private content");
  });

  it("refuses malformed CSP reports", async () => {
    const response = await reportCsp(new Request(
      "https://slova.test/api/security/csp-report",
      { method: "POST", body: "not-json" },
    ));
    expect(response.status).toBe(400);
  });
});
