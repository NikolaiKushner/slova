# Application security operations

## Rate limits

Authentication, email, translation, audio, and write bursts use fixed windows.
The first accepted request creates a window ending at `expiresAt`; requests up
to the configured limit are accepted, and later requests are rejected until
that exact expiry. PostgreSQL decides and increments in one statement, so
parallel serverless invocations cannot overshoot the limit.

Credential login is limited independently by normalized email and client IP.
Only syntactically valid addresses from Vercel's forwarding headers become
limiter keys; malformed values share the bounded `unknown` key.

## Scheduled cleanup

Vercel calls `GET /api/cron/cleanup` daily at 03:17 UTC. The route requires the
exact `Authorization: Bearer $CRON_SECRET` header and deletes expired
`RateLimit` and `VerificationToken` rows. `CRON_SECRET` is a production-required
encrypted environment variable and must be independent from `AUTH_SECRET`.

## Content Security Policy

The application sends `Content-Security-Policy-Report-Only` first. Reports are
accepted at `/api/security/csp-report`, bounded to 16 KiB, reduced to a safe
field allow-list, and written as structured `security.csp.violation` runtime
logs. Review those reports before enforcing the policy. A strict nonce policy
would force dynamic rendering in Next.js 16.3, so nonce and static-rendering
tradeoffs belong in a separate rollout.

The policy names LogRocket's CDN and ingest hosts, and allows a blob worker,
because session replay runs a third-party recorder in the browser. It records
the signed-in application only, and only in a production build with
`NEXT_PUBLIC_LOGROCKET_APP_ID` set — `/login`, `/register` and the marketing
pages are outside the recorded tree. `lib/logrocket.ts` drops every
`/api/auth/*` request and response pair before it is sent, strips
`authorization`, `cookie`, `set-cookie` and `x-csrf-token` from the rest, and
identifies the session by user id alone. The account name and email in the
sidebar carry `data-private`, so their contents never leave the browser.
Unsetting the environment variable stops recording without a code change.
`npm run account:whois` resolves a replay's user id to the account behind it;
see `docs/operations.md`.

## HTTPS transport

On 2026-08-18, the Vercel project listed `slova.study` and `www.slova.study`,
and both returned HTTP 200 over HTTPS. HSTS therefore starts with a reversible
seven-day `max-age`, includes subdomains, and deliberately omits preload. Extend
the duration only after observing the initial production rollout.
