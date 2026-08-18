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

## HTTPS transport

On 2026-08-18, the Vercel project listed `slova.study` and `www.slova.study`,
and both returned HTTP 200 over HTTPS. HSTS therefore starts with a reversible
seven-day `max-age`, includes subdomains, and deliberately omits preload. Extend
the duration only after observing the initial production rollout.
