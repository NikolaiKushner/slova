import { describe, expect, it, vi } from "vitest";

import { postJsonWithRetry } from "@/lib/client-mutation";

describe("postJsonWithRetry", () => {
  it("retries network and server failures with bounded backoff", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ saved: true }, { status: 200 }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await expect(
      postJsonWithRetry<{ saved: boolean }>("/write", { value: 1 }, {
        fetcher,
        sleep,
        onRetry,
      }),
    ).resolves.toEqual({ saved: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 750);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent client error", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: "Invalid review" }, { status: 400 }),
    );
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      postJsonWithRetry("/write", {}, { fetcher, sleep }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid review",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops after three retries", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      postJsonWithRetry("/write", {}, { fetcher, sleep }),
    ).rejects.toThrow("offline");
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });
});
