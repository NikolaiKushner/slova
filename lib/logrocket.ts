/**
 * Session replay (LogRocket). Records only the signed-in application, only in
 * production builds, and only when NEXT_PUBLIC_LOGROCKET_APP_ID is set — the
 * free plan is 1,000 sessions a month, so anonymous marketing traffic and
 * local development must not spend it. Mounted by `components/logrocket.tsx`
 * from the authenticated layout; `/login` and `/register` are outside that
 * tree and are therefore never recorded.
 */

/**
 * The shapes LogRocket hands to the sanitizers, kept structural on purpose:
 * the SDK's own `IRequest`/`IResponse` live in a namespace it does not export,
 * and declaring only the fields we touch keeps the tests free of the SDK.
 */
type SanitizableHeaders = { [name: string]: string | null | undefined };
type SanitizableRequest = { url: string; headers: SanitizableHeaders };
type SanitizableResponse = { url?: string; headers: SanitizableHeaders };

/** Stripped from every recorded request. A replay never needs a credential. */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-csrf-token",
]);

/**
 * NextAuth carries session tokens, CSRF tokens and one-time credentials in
 * both directions on these routes, so the pair is dropped rather than redacted.
 */
const PRIVATE_PATH_PREFIX = "/api/auth";

/**
 * Relative and absolute URLs both reach here; the base is only there to let
 * `URL` parse the relative ones, and never appears in a comparison.
 */
function isPrivatePath(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url, "http://slova.invalid").pathname.startsWith(
      PRIVATE_PATH_PREFIX,
    );
  } catch {
    return false;
  }
}

function stripSensitiveHeaders(headers: SanitizableHeaders): void {
  for (const name of Object.keys(headers)) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) delete headers[name];
  }
}

/**
 * `network.requestSanitizer`. Returning null discards the request and its
 * response. Everything else keeps its body: the words a learner typed and the
 * translation that came back are the reason a replay is worth watching.
 */
export function sanitizeRequest<T extends SanitizableRequest>(
  request: T,
): T | null {
  if (isPrivatePath(request.url)) return null;
  stripSensitiveHeaders(request.headers);
  return request;
}

/** `network.responseSanitizer`. Same rule, applied to the other half. */
export function sanitizeResponse<T extends SanitizableResponse>(
  response: T,
): T | null {
  if (isPrivatePath(response.url)) return null;
  stripSensitiveHeaders(response.headers);
  return response;
}

/**
 * The app id to record under, or null to stay silent. Both conditions are
 * deliberate: an unset variable must degrade to "no recording" rather than
 * fail a deploy, and a development build must never reach LogRocket at all.
 */
export function logRocketAppId(env: {
  nodeEnv?: string;
  appId?: string;
}): string | null {
  if (env.nodeEnv !== "production") return null;
  const appId = env.appId?.trim();
  return appId ? appId : null;
}

let started = false;

/**
 * Loads and starts the SDK. The import is dynamic so the recorder never enters
 * the first-load bundle — it is fetched after hydration, and only for the
 * signed-in users who are actually being recorded. Idempotent: React may run
 * the effect twice in development, and `init` must not.
 *
 * `process.env.NEXT_PUBLIC_*` is read literally here because Next.js inlines
 * the value at build time only when it sees that exact member access.
 */
export async function startLogRocket(userId: string): Promise<void> {
  if (started) return;
  const appId = logRocketAppId({
    nodeEnv: process.env.NODE_ENV,
    appId: process.env.NEXT_PUBLIC_LOGROCKET_APP_ID,
  });
  if (!appId) return;
  started = true;

  const LogRocket = (await import("logrocket")).default;
  LogRocket.init(appId, {
    // Ties a replay to the deploy it came from. Vercel exposes the SHA to the
    // client automatically; undefined elsewhere, which LogRocket accepts.
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    network: {
      requestSanitizer: sanitizeRequest,
      responseSanitizer: sanitizeResponse,
    },
  });
  // The id only. No email or name: LogRocket does not need to know who this is
  // to make the session findable, and the database already does.
  LogRocket.identify(userId);
}
