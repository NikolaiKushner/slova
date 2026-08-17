export type MutationRetry = {
  attempt: number;
  delayMs: number;
  status: number | null;
};

export class MutationHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MutationHttpError";
    this.status = status;
  }
}

const RETRY_DELAYS_MS = [250, 750, 1_500] as const;
const TRANSIENT_STATUSES = new Set([408, 425, 429]);

function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.has(status) || status >= 500;
}

function retryAfterMs(response: Response, fallback: number): number {
  const raw = response.headers.get("Retry-After");
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) return fallback;
  return Math.min(5_000, Math.round(seconds * 1_000));
}

async function errorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}.`;
  const payload = await response.json().catch(() => null);
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export async function postJsonWithRetry<T>(
  url: string,
  body: unknown,
  options: {
    fetcher?: typeof fetch;
    sleep?: (delayMs: number) => Promise<void>;
    onRetry?: (retry: MutationRetry) => void;
  } = {},
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const sleep =
    options.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs)));

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const delayMs = RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined) throw error;
      options.onRetry?.({ attempt: attempt + 1, delayMs, status: null });
      await sleep(delayMs);
      continue;
    }

    if (response.ok) {
      return (await response.json().catch(() => null)) as T;
    }

    const message = await errorMessage(response);
    const fallbackDelay = RETRY_DELAYS_MS[attempt];
    if (!isTransientStatus(response.status) || fallbackDelay === undefined) {
      throw new MutationHttpError(response.status, message);
    }
    const delayMs = retryAfterMs(response, fallbackDelay);
    options.onRetry?.({
      attempt: attempt + 1,
      delayMs,
      status: response.status,
    });
    await sleep(delayMs);
  }
}
