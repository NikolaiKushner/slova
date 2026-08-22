# Project review remediation roadmap

**Status:** shipped 2026-08-21. Delivered across several pull requests rather
than one, which is why the line below still reads *planned* — that was true
the day it was written and is left as the record. Verified against the tree
on 2026-08-22: every phase has landed. Recovered from the deleted branch
`codex/project-review-roadmap` (`cb44c10`), where it was the only copy.

**Date:** 2026-08-17  
**Branch:** `codex/project-review-roadmap`  
**Status:** planned; implementation not started  
**Baseline:** `main` at `3253b8d323cbdd0492e648b0131c9584f37bc709`

## Purpose

This document preserves the findings from the full codebase, production UI,
and Vercel review. The project is healthy enough to improve incrementally; it
does not need a rewrite or a visual redesign. The first work should protect
learning data from duplicate and concurrent requests, make client writes
reliable, and establish a repeatable authenticated end-to-end test path.

## Verified baseline

- The repository was clean and `main` matched `origin/main` at review time.
- 49 test files and 508 tests passed.
- ESLint, TypeScript, and the npm lockfile check passed.
- The current production deployment built successfully on Vercel.
- The current deployment had no warning or error runtime logs in the available
  24-hour window.
- The public landing page had no console errors or horizontal overflow at 390,
  768, 834, 1024, and 1194 pixel viewport widths.
- The production UI is coherent and does not need a redesign.
- A local production build could not complete inside the Codex sandbox because
  process creation and port binding were denied. The same commit built on
  Vercel, so this was not treated as an application failure.

## Delivery principles

- Preserve the existing product structure and design system.
- Fix data integrity before adding new product behavior.
- Treat every learning mutation as retryable and potentially duplicated.
- Keep migrations backward-compatible through an expand/contract sequence.
- Measure performance before and after query or provider changes.
- Do not commit passwords, tokens, production connection strings, or Playwright
  storage state.
- Use an isolated test database or database branch by default. Any production
  test-user seed must require an explicit opt-in guard.

## Phase 0: authenticated test fixture and E2E foundation

**Priority:** P0  
**Estimate:** 1-2 days

Create one deterministic test user that an agent and Playwright can use for
authenticated flows. This fixture must be safe to run repeatedly and must not
depend on email delivery or Google OAuth.

### Implementation

- Add a dedicated idempotent seed command, separate from the general data seed,
  for example `npm run db:seed-test-user`.
- Read the identity from environment variables such as
  `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD`.
- Hash the password with the same application password helper used by normal
  registration; never store a plain password in the repository.
- Create the user with `emailVerified` set and with an initial test dataset:
  one empty set, one populated set, due and new words, a partially studied
  word, and a course with partial progress.
- Make the seed idempotent and deterministic. Re-running it must restore the
  expected fixture state instead of adding duplicate words, sets, or progress.
- Mark fixture records with an unambiguous source value where the current
  schema supports it. If reliable identification requires schema support, add
  a narrowly scoped `isTestUser` or equivalent field rather than inferring from
  the email domain.
- Default to a local, preview, or staging database branch. Refuse to run when
  the target appears to be production unless an explicit variable such as
  `E2E_ALLOW_PRODUCTION_SEED=true` is set.
- If a production smoke-test account is deliberately approved, keep it isolated
  from analytics and user metrics where possible and rotate its password.
- Store CI and Vercel credentials only as encrypted environment variables.
- Add the Playwright auth setup that logs in through the real credentials form
  and writes `storageState` to a gitignored temporary path.
- Add cleanup/reset behavior so every test run starts from a known state.

### Acceptance criteria

- A fresh test database can be seeded with one command.
- The command can run twice without creating duplicates.
- Playwright can sign in through the actual login page without email or OAuth.
- An agent can reuse the same documented flow for manual browser verification.
- No secret or authenticated storage state appears in Git.
- The command refuses an unapproved production target.

## Phase 1: learning data integrity

**Priority:** P0  
**Estimate:** 2-3 days

### Review, graduation, and undo

The review route reads a `UserWord` before its transaction, calculates the
next FSRS state from that snapshot, and then updates the row unconditionally.
Two tabs, a retry, or a double submission can therefore create multiple logs
from one state while only one progression survives. Graduation has the same
shape. Undo restores the latest log without a compare-and-swap guard and does
not roll back sitting counters.

- Move the read, state transition, update, and review-log insert into one
  serialized operation.
- Use a row lock, a serializable transaction with retry, or an optimistic
  version column with compare-and-swap semantics.
- Give each answered card a client-generated idempotency key and enforce its
  uniqueness in the database.
- Return the authoritative persisted state to the client.
- Make undo identify the exact review operation it reverses.
- Update or correct `StudySitting` counters as part of undo so aggregate and
  log-based statistics cannot diverge.
- Apply the same concurrency model to practice graduation.

### Course progress

- Make attempt increments, best-score updates, missed-rule union, lesson
  completion, and course completion transactional.
- Prevent concurrent final-lesson submissions from missing course completion.
- Record and document the current trust decision that exercise results are
  supplied by the client in a self-study product.

### Acceptance criteria

- Duplicate requests produce one logical review result.
- Two concurrent reviews cannot calculate from the same word version.
- Undo restores the exact prior state and consistent sitting totals.
- Concurrent course submissions preserve attempts, best score, rules, and
  completion.
- Database-backed integration tests reproduce each former race.

## Phase 2: reliable client mutations

**Priority:** P0  
**Estimate:** 1-2 days

- Stop silently discarding failed practice-review requests.
- Track pending mutations and retry transient failures with bounded backoff.
- Do not show a final session summary until critical review writes have been
  acknowledged or clearly reported as recoverable failures.
- Validate `response.ok` when saving lesson progress and provide a retry path.
- Keep page-exit beacons best-effort, but report normal sitting-update failures
  through structured telemetry.
- Add user-facing copy for offline, retrying, failed, and recovered states.

## Phase 3: shared lexicon correctness and latency

**Priority:** P1  
**Estimate:** 2-3 days

- Replace per-translation sequential queries with batch reads and writes.
- Treat confirmation rows as the source of truth and update any denormalized
  counter atomically.
- Add a database constraint that permits only one primary translation per
  lexeme and target language.
- Resolve concurrent primary promotion inside a transaction.
- Complete the response stream before non-critical shared-cache maintenance,
  using Next.js `after()` or a durable queue when appropriate.
- Add metrics for lexicon hit rate, model miss rate, promotion conflicts, and
  translation latency.

## Phase 4: query and rendering performance

**Priority:** P1  
**Estimate:** 2-4 days

- Split the lightweight practice progress line from the full 365-day activity
  report.
- Calculate set due/new totals with database aggregation rather than loading
  every set item and word into JavaScript.
- Select only the fields used by set and progress pages.
- Consider daily aggregate records when real-user history makes raw activity
  queries materially expensive.
- Move `SessionProvider` out of the root layout when public routes do not need
  it, or pass already-loaded session data into authenticated navigation.
- Measure whether repeated `auth()` calls cause duplicate session-version
  database work and centralize the request result if needed.
- Scope client-side internationalization messages by route or namespace rather
  than sending the complete locale catalog to every page.
- Review why all application routes are dynamic and make public pages static
  only when locale and auth behavior remain correct.
- Remove stale `better-sqlite3` external-package configuration and verify that
  unused theme/toast dependencies can be removed.
- Capture Vercel Web Vitals and query timings before and after each change.

## Phase 5: authentication, rate limiting, and security

**Priority:** P1  
**Estimate:** 2-3 days

- Hash a replacement password before consuming its reset token.
- Atomically validate and consume verification/reset tokens together with the
  user update.
- Make token reissue atomic so concurrent requests cannot leave multiple valid
  tokens.
- Add Auth.js adapter-level tests for the unverified password account followed
  by Google account-linking sequence.
- Add an IP dimension to credential-login rate limiting in addition to email.
- Decide whether the limiter is fixed-window or sliding-window and make its
  name, behavior, and tests agree.
- Replace the current multi-query limiter mutation with an atomic operation.
- Add TTL cleanup for expired rate-limit keys.
- Introduce an application Content Security Policy in Report-Only mode first,
  then enforce it after violations and Next.js nonce requirements are handled.
- Evaluate HSTS only after confirming that every relevant subdomain is HTTPS.

## Phase 6: runtime, dependencies, and deployment safety

**Priority:** P1  
**Estimate:** 1-2 days

- Pin Vercel to Node 22 and align npm 10 across local development, CI, package
  metadata, and production. The reviewed deployment used Node 24/npm 11 and
  emitted an engine warning.
- Migrate deprecated `middleware.ts` behavior to the Next.js 16.3 `proxy.ts`
  convention and verify auth and locale redirects.
- Apply safe patch/minor updates for Next.js, next-intl, Recharts, shadcn, the
  Anthropic SDK, and `tsx`.
- Resolve the patched `nanoid` advisory through a compatible dependency or
  lockfile update.
- Track the `deepmerge-ts` advisory through Prisma; do not blindly downgrade
  Prisma to satisfy the automated audit suggestion.
- Upgrade TypeScript, ESLint, Node types, or Auth.js prereleases as separate
  compatibility projects rather than mixing them into remediation work.
- Enable pull-request previews or create a staging Vercel project.
- Require tests, lint, type checking, and build verification before merging.
- Separate schema migration execution from the production application build,
  or guarantee backward compatibility through expand/contract migrations.
- Audit and remove unused Vercel environment variables without exposing their
  values.
- Investigate the approximately 526 MB Vercel build cache and its upload time.

## Phase 7: product behavior and design polish

**Priority:** P2  
**Estimate:** 2-3 days

- Decide whether the daily-new-word limit resets in UTC or in the learner's
  configured timezone. Implement and document the product decision.
- Add branded root and route-group error boundaries, a not-found page, and
  meaningful loading states.
- Remove or production-gate `/dev/kit`, which is currently publicly reachable
  despite being labeled development-only.
- Add keyboard-only and screen-reader smoke coverage for practice and lessons.
- Run automated accessibility checks at 390, 768, 834, 1024, and 1194 pixels.
- Keep the current visual system; make targeted improvements based on measured
  authenticated-flow friction rather than starting a redesign.

## Test strategy

### Unit tests

Keep the existing pure tests for FSRS, budgets, auth policy, lexicon behavior,
course calculations, and content validation.

### Database integration tests

Run against an ephemeral local Postgres instance or isolated Neon branch and
cover:

- duplicate and concurrent review submission;
- concurrent practice graduation;
- exact undo and sitting-counter correction;
- concurrent lexicon confirmations and primary promotion;
- concurrent course lesson completion;
- password reset and verification token atomicity;
- the durable rate-limiter implementation;
- ownership checks on every mutating route.

### Playwright end-to-end tests

Use the Phase 0 test fixture to cover:

1. Sign in with credentials.
2. Create and edit a word set.
3. Add and paste words.
4. Exercise a mocked or controlled translation stream.
5. Complete a practice answer and verify persistence after reload.
6. Undo a review and verify restored state and totals.
7. Complete a lesson and verify course progress.
8. Log out and verify protected-route behavior.
9. Repeat critical paths at phone, tablet, and desktop widths.
10. Run axe checks and fail on serious accessibility violations.

## Observability

- Add structured events for review persistence failures, idempotency conflicts,
  lesson-save failures, auth/token failures, database latency, translation
  latency, and lexicon cache hits/misses.
- Add alerts with actionable thresholds rather than relying on short-retention
  runtime-log inspection.
- Keep Vercel Analytics and Speed Insights, and add an error tracker only after
  defining data-scrubbing and environment separation.
- Exclude the deterministic test account from product analytics where feasible.

## Recommended execution order

1. Phase 0: test fixture and authenticated E2E foundation.
2. Phase 1: learning and course data integrity.
3. Phase 2: reliable client writes.
4. Phase 3: lexicon correctness and latency.
5. Phase 4: query and rendering performance.
6. Phase 5: auth, rate limiting, and security.
7. Phase 6: runtime and deployment safety.
8. Phase 7: product decisions and design polish.

The first three phases form the minimum reliability milestone. Performance and
operational improvements should follow only after their baseline metrics and
test coverage exist.
