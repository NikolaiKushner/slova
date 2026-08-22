import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const allowFixedWindowAttempt = vi.fn();

const prisma = vi.hoisted(() => ({
  userText: {
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("@/lib/rate-limit", () => ({
  allowFixedWindowAttempt: (...args: unknown[]) =>
    allowFixedWindowAttempt(...args),
}));
vi.mock("@/lib/i18n/api-error", () => ({
  jsonError: (key: string, status: number) =>
    Response.json({ error: key }, { status }),
}));

const { POST } = await import("@/app/api/texts/route");
const { DELETE } = await import("@/app/api/texts/[id]/route");
const { MAX_TEXT_CHARS, MAX_TEXTS } = await import("@/lib/texts/draft");

const post = (body: unknown) =>
  POST(
    new Request("https://slova.test/api/texts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

const remove = (id: string) =>
  DELETE(new Request(`https://slova.test/api/texts/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
  allowFixedWindowAttempt.mockResolvedValue(true);
  prisma.userText.count.mockResolvedValue(0);
  prisma.userText.create.mockResolvedValue({ id: "text-1" });
});

describe("POST /api/texts", () => {
  it("refuses an anonymous caller", async () => {
    auth.mockResolvedValue(null);
    expect((await post({ body: "Hello." })).status).toBe(401);
  });

  it("names a text by its first line", async () => {
    const response = await post({
      body: "A morning in Tbilisi\nIt was raining all day.",
    });

    expect(response.status).toBe(201);
    expect(prisma.userText.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          title: "A morning in Tbilisi",
          wordCount: 9,
        }),
      }),
    );
  });

  it("keeps the title the reader typed", async () => {
    await post({ body: "First line.\nSecond.", title: "Rain" });

    expect(prisma.userText.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Rain" }),
      }),
    );
  });

  it("refuses a paste over the character cap", async () => {
    const response = await post({ body: "a".repeat(MAX_TEXT_CHARS + 1) });

    expect(response.status).toBe(400);
    expect(prisma.userText.create).not.toHaveBeenCalled();
  });

  it("refuses an empty paste", async () => {
    expect((await post({ body: "   " })).status).toBe(400);
  });

  it("refuses the text after the last one that fits", async () => {
    prisma.userText.count.mockResolvedValue(MAX_TEXTS);
    const response = await post({ body: "One more." });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "tooManyTexts" });
    expect(prisma.userText.create).not.toHaveBeenCalled();
  });

  it("refuses a caller who has been writing too fast", async () => {
    allowFixedWindowAttempt.mockResolvedValue(false);
    expect((await post({ body: "Hello." })).status).toBe(429);
  });
});

describe("DELETE /api/texts/[id]", () => {
  it("deletes a text this account owns", async () => {
    prisma.userText.findFirst.mockResolvedValue({ id: "text-1" });

    expect((await remove("text-1")).status).toBe(200);
    expect(prisma.userText.delete).toHaveBeenCalledWith({
      where: { id: "text-1" },
    });
  });

  it("is a 404, not a 403, for somebody else's text", async () => {
    prisma.userText.findFirst.mockResolvedValue(null);

    expect((await remove("text-9")).status).toBe(404);
    expect(prisma.userText.delete).not.toHaveBeenCalled();
  });
});
