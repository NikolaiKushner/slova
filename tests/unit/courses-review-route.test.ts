import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const persistGrammarReview = vi.fn();
const requestTimeZone = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/request-timezone", () => ({
  requestTimeZone: () => requestTimeZone(),
}));
vi.mock("@/lib/i18n/api-error", () => ({
  jsonError: (key: string, status: number) =>
    Response.json({ error: key }, { status }),
}));
vi.mock("@/lib/courses/review-store", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/courses/review-store")
  >("@/lib/courses/review-store");
  return {
    ...actual,
    persistGrammarReview: (input: unknown) => persistGrammarReview(input),
  };
});

const { POST } = await import("@/app/api/courses/review/route");
const {
  GrammarReviewConflictError,
  GrammarReviewNotFoundError,
} = await import("@/lib/courses/review-store");

const BODY = {
  memoryId: "cmemory1",
  courseSlug: "present-simple",
  ruleId: "ps-third-person-s",
  exerciseId: "bank-ps-third-person-s-1",
  operationId: "3f1b8b3e-6a2f-4a1e-9f6a-1f2c3d4e5f60",
  correct: false,
  elapsedMs: 5312,
  sittingId: "csitting1",
};

function post(body: unknown): Request {
  return new Request("https://slova.test/api/courses/review", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
  requestTimeZone.mockResolvedValue("Europe/Moscow");
  persistGrammarReview.mockResolvedValue({
    operationId: BODY.operationId,
    duplicate: false,
    stale: false,
    stage: 0,
    dueAt: new Date("2026-08-21T21:00:00.000Z"),
    cleared: false,
  });
});

describe("POST /api/courses/review", () => {
  it("refuses an anonymous answer", async () => {
    auth.mockResolvedValue(null);
    const response = await POST(post(BODY));
    expect(response.status).toBe(401);
    expect(persistGrammarReview).not.toHaveBeenCalled();
  });

  it("refuses a body that is not the contract", async () => {
    for (const body of [
      "not json",
      {},
      { ...BODY, operationId: "not-a-uuid" },
      { ...BODY, correct: "yes" },
      { ...BODY, ruleId: "" },
      { ...BODY, exerciseId: "x".repeat(81) },
    ]) {
      const response = await POST(post(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalidGrammarReview" });
    }
    expect(persistGrammarReview).not.toHaveBeenCalled();
  });

  it("takes the zone from the request, never from the body", async () => {
    await POST(post({ ...BODY, timeZone: "Pacific/Auckland" }));
    expect(persistGrammarReview).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", timeZone: "Europe/Moscow" }),
    );
    expect(persistGrammarReview.mock.calls[0][0]).not.toHaveProperty(
      "timeZone",
      "Pacific/Auckland",
    );
  });

  it("clamps a wild elapsed time and passes null when absent", async () => {
    await POST(post({ ...BODY, elapsedMs: 9_000_000 }));
    expect(persistGrammarReview.mock.calls[0][0].elapsedMs).toBe(120_000);

    const withoutElapsed = { ...BODY, elapsedMs: undefined };
    await POST(post(withoutElapsed));
    expect(persistGrammarReview.mock.calls[1][0].elapsedMs).toBeNull();
  });

  it("returns the new schedule as strings the client can read", async () => {
    const response = await POST(post(BODY));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      review: {
        operationId: BODY.operationId,
        duplicate: false,
        stale: false,
        stage: 0,
        dueAt: "2026-08-21T21:00:00.000Z",
        cleared: false,
      },
    });
  });

  it("reports a cleared rule with no next due date", async () => {
    persistGrammarReview.mockResolvedValue({
      operationId: BODY.operationId,
      duplicate: false,
      stale: false,
      stage: 3,
      dueAt: null,
      cleared: true,
    });
    const response = await POST(post(BODY));
    const payload = await response.json();
    expect(payload.review).toMatchObject({ dueAt: null, cleared: true });
  });

  it("maps missing content to 404 and a reused operation id to 409", async () => {
    persistGrammarReview.mockRejectedValue(new GrammarReviewNotFoundError());
    expect((await POST(post(BODY))).status).toBe(404);

    persistGrammarReview.mockRejectedValue(new GrammarReviewConflictError());
    const conflict = await POST(post(BODY));
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ error: "invalidGrammarReview" });
  });

  it("lets an unexpected failure reach the global route error", async () => {
    persistGrammarReview.mockRejectedValue(new Error("connection lost"));
    await expect(POST(post(BODY))).rejects.toThrow("connection lost");
  });
});
