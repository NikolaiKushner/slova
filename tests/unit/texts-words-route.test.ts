import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const allowFixedWindowAttempt = vi.fn();
const lookupBatch = vi.fn();
const addWords = vi.fn();

const prisma = vi.hoisted(() => ({
  userText: { findFirst: vi.fn() },
  userWord: { findFirst: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("@/lib/rate-limit", () => ({
  allowFixedWindowAttempt: (...args: unknown[]) => allowFixedWindowAttempt(...args),
}));
vi.mock("@/lib/lexicon/lookup", () => ({
  lookupBatch: (texts: readonly string[]) => lookupBatch(texts),
}));
vi.mock("@/lib/words/add", () => ({
  addWords: (input: unknown) => addWords(input),
}));
vi.mock("@/lib/i18n/api-error", () => ({
  jsonError: (key: string, status: number) =>
    Response.json({ error: key }, { status }),
}));

const { POST } = await import("@/app/api/texts/[id]/words/route");

const BODY = "She went to two cities.";

const post = (tokenId: unknown, id = "text-1") =>
  POST(
    new Request(`https://slova.test/api/texts/${id}/words`, {
      method: "POST",
      body: JSON.stringify({ tokenId }),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
  allowFixedWindowAttempt.mockResolvedValue(true);
  prisma.userText.findFirst.mockResolvedValue({ body: BODY, glosses: {} });
  prisma.userWord.findFirst.mockResolvedValue({
    introducedAt: null,
    intervalDays: 0,
  });
  lookupBatch.mockResolvedValue({
    hits: new Map([["go", { translation: "идти" }]]),
    misses: [],
  });
  addWords.mockResolvedValue({ added: 1 });
});

describe("POST /api/texts/[id]/words", () => {
  it("files the dictionary form, not the spelling in the text", async () => {
    const response = await post("0:1");

    expect(response.status).toBe(200);
    expect(addWords).toHaveBeenCalledWith({
      userId: "user-1",
      words: [{ front: "go", back: "идти" }],
      source: "text:text-1",
    });
  });

  it("is idempotent, because addWords is", async () => {
    await post("0:1");
    await post("0:1");

    expect(addWords).toHaveBeenCalledTimes(2);
    expect(addWords.mock.calls[0]).toEqual(addWords.mock.calls[1]);
  });

  it("is a 404 for a text this account does not own", async () => {
    prisma.userText.findFirst.mockResolvedValue(null);

    expect((await post("0:1")).status).toBe(404);
    expect(addWords).not.toHaveBeenCalled();
  });

  it("refuses a token that is not in this text", async () => {
    expect((await post("9:9")).status).toBe(400);
    expect(addWords).not.toHaveBeenCalled();
  });

  it("refuses a word nothing can translate yet", async () => {
    lookupBatch.mockResolvedValue({ hits: new Map(), misses: [] });
    const response = await post("0:1");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "noTranslationYet" });
    expect(addWords).not.toHaveBeenCalled();
  });

  it("falls back to this text's own gloss, never to the base", async () => {
    lookupBatch.mockResolvedValue({ hits: new Map(), misses: [] });
    prisma.userText.findFirst.mockResolvedValue({
      body: BODY,
      glosses: { "0:1": "отправилась" },
    });

    expect((await post("0:1")).status).toBe(200);
    expect(addWords).toHaveBeenCalledWith(
      expect.objectContaining({ words: [{ front: "go", back: "отправилась" }] }),
    );
  });

  it("refuses an anonymous caller before it reads anything", async () => {
    auth.mockResolvedValue(null);

    expect((await post("0:1")).status).toBe(401);
    expect(prisma.userText.findFirst).not.toHaveBeenCalled();
  });

  it("refuses a caller who has been adding too fast", async () => {
    allowFixedWindowAttempt.mockResolvedValue(false);

    expect((await post("0:1")).status).toBe(429);
    expect(addWords).not.toHaveBeenCalled();
  });
});
