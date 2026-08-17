# Project review remediation roadmap

**Date:** 2026-08-17  
**Branch:** `feat/project-review`  
**Status:** implementation in progress; Phases 0, 8, 1, and 2 complete
**Baseline:** `main` at `3253b8d323cbdd0492e648b0131c9584f37bc709`  
**Re-verified:** 2026-08-17 against the same baseline. Every finding below was
re-checked in the code. Phase numbers are stable labels, not the running order;
the running order lives in "Recommended execution order".

## Purpose

This document preserves the findings from the full codebase, production UI,
and Vercel review. The project is healthy enough to improve incrementally; it
does not need a rewrite or a visual redesign. The first work should protect
learning data from duplicate and concurrent requests, put a hard ceiling on what
the paid providers can cost, make client writes reliable, and establish a
repeatable authenticated end-to-end test path.

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

### Corrections found during re-verification

These do not change the plan's direction, but the phases below were written
slightly stronger than the code warrants in a few places.

- `StudySitting` counters are already incremented with atomic SQL in
  `persistTouch` (`lib/sitting-store.ts`), so aggregate counters are not
  themselves racy. The Phase 1 counter work is about undo only.
- Not rolling sitting counters back on undo is a recorded v1 decision, not an
  oversight: `app/api/study/undo/route.ts` documents it and
  `tests/unit/sitting.test.ts` asserts it as a "known gap in v1". Phase 1
  reverses that decision, so it must also rewrite that test.
- Practice graduation already refuses a second graduation through an
  `introducedAt` check, which blocks re-graduation but not two concurrent
  first-time graduations.
- One route is static (`app/og.png/route.ts` sets `force-static`). Everything
  else is dynamic, largely because `i18n/request.ts` reads cookies and headers
  on every request.

## Delivery principles

- Preserve the existing product structure and design system.
- Fix data integrity before adding new product behavior.
- Treat every learning mutation as retryable and potentially duplicated.
- Keep migrations backward-compatible through an expand/contract sequence.
- Measure performance before and after query or provider changes.
- Every paid external call must reserve its spend atomically before the call,
  not record it afterwards.
- Do not commit passwords, tokens, production connection strings, or Playwright
  storage state.
- Use an isolated test database or database branch by default. Any production
  test-user seed must require an explicit opt-in guard.

## Phase 0: authenticated test fixture and E2E foundation

**Priority:** P0  
**Estimate:** 1-2 days
**Status:** implemented 2026-08-18

Create one deterministic test user that an agent and Playwright can use for
authenticated flows. This fixture must be safe to run repeatedly and must not
depend on email delivery or Google OAuth.

### Test infrastructure prerequisites

None of the machinery this phase and the test strategy assume exists yet, and
one of the gaps is actively dangerous. Do this part first.

- **`npm test` must stay pure and fast, and database tests must never join it.**
  It runs in three places, and one of them is production. `vercel:preflight`
  runs it during deployment with production environment variables present, so an
  integration test added to `npm test` would run against the production database
  on every deploy. The `.githooks/pre-commit` hook runs it on every commit. CI
  runs it with no database reachable at all.
- Add separate scripts, for example `test:integration` and `test:e2e`, with
  their own Vitest config or Vitest project. `vitest.config.mts` currently sets
  `include: ["tests/unit/**/*.test.ts"]`, so a new `tests/integration/**`
  directory is silently ignored until the config changes — a failure mode that
  looks like passing tests.
- Install Playwright. It is not a dependency today, there is no config, and
  there is no `tests/e2e` directory.
- Decide the integration-test database and document it. There is no
  `docker-compose.yml` and no local Postgres instructions; the repo assumes
  Neon, so a Neon branch per run is the path of least resistance.
- Add a CI job for the new suites: a Postgres service or Neon branch,
  `prisma migrate deploy`, and Playwright browsers. Keep it separate from the
  existing fast job.
- Keep `E2E_TEST_USER_*` out of `scripts/check-env.mjs` required set, so a
  missing test credential can never fail a production deploy. Document them in
  `.env.example` instead.
- Extend `TEST_USERS.md`, which currently documents manual local sign-in only,
  with the automated fixture flow.

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
- `npm test` still runs unit tests only, still takes seconds, and still
  contains nothing that needs a database.

## Phase 1: learning data integrity

**Priority:** P0  
**Estimate:** 2-3 days
**Status:** implemented 2026-08-18

### Review, graduation, and undo

The review route reads a `UserWord` before its transaction, calculates the
next FSRS state from that snapshot, and then updates the row unconditionally.
Two tabs, a retry, or a double submission can therefore create multiple logs
from one state while only one progression survives. Graduation has the same
shape. Undo restores the latest log without a compare-and-swap guard and does
not roll back sitting counters. The routes are `app/api/study/review/route.ts`,
`app/api/practice/graduate/route.ts`, and `app/api/study/undo/route.ts`; course
progress lives in `lib/courses/progress.ts`. No relevant table carries a version
column, and `ReviewLog` has no uniqueness that would deduplicate an answer.

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
**Status:** implemented 2026-08-18

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
  `allowAttemptDurable` currently issues an upsert, a window-reset update, and
  an increment as three separate queries.
- Add TTL cleanup for expired rate-limit keys. Expired windows are reset in
  place, so the `RateLimit` table grows once per distinct key and never shrinks.
- Add the same cleanup for expired `VerificationToken` rows, which are removed
  on use and on reissue but never when they simply expire.
- Decide how scheduled work runs at all. `vercel.json` declares no `crons`, so
  there is no existing mechanism for either cleanup; a single cron route that
  performs both is enough, and it needs a secret or Vercel cron authentication.
- Bound the repeated `set` query parameter on `/api/practice/session` and
  `/api/practice/counts`, which call `searchParams.getAll("set")` with no limit
  on how many values are accepted.
- Validate and ownership-check `setId` on `/api/study/queue`. It is currently
  passed straight through as an unvalidated string; another user's set id
  returns an empty queue rather than an error, which is safe but untested and
  easy to regress into a leak.
- Add `userId` to the mutation `where` clause on routes that verify ownership
  with a preceding `findFirst` and then update by `id` alone. Not exploitable
  with the current identifiers, but it makes the guarantee local to the write.
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

## Phase 8: paid-provider spend ceilings

**Priority:** P0  
**Estimate:** 1-2 days
**Status:** implemented 2026-08-18; operational decisions are recorded in
`docs/provider-spend.md`.

The original review covered rate limiting only as an authentication concern. The
two paid providers are the one class of defect that costs money rather than
correctness, and registration is open, so any account that completes signup can
spend against the project's API keys.

### Translation token budget

Request slots are already reserved atomically per user and app-wide, and that is
the load-bearing protection. The daily *token* caps are not: they are read
before the model call and written after it, so calls fired in parallel all pass
the same check. `app/api/translate/batch/route.ts` documents this and
compensates by keeping the per-request bound small, which makes the real daily
ceiling `requests × max_tokens` rather than the configured token limit.

- Reserve an estimated token cost atomically alongside the request slot, then
  reconcile with actual usage after the call.
- Alternatively, accept the current design explicitly: state in the code that
  the token caps are advisory, and treat the request cap plus `max_tokens` as
  the only real ceiling. Either outcome is fine; the undocumented middle is not.
- Add an alert when either daily cap is reached, so exhaustion is visible
  without reading logs.

### On-demand speech and shared storage

`/api/audio` is gated behind `TTS_ON_DEMAND_ENABLED`, authenticated, burst
limited, and reserves character budget atomically. Two problems remain.

- A successful synthesis writes into the shared `Lexeme` table and uploads to
  R2 permanently, so any authenticated user can add audio for arbitrary text up
  to 200 characters and grow shared storage without bound. Decide whether
  on-demand synthesis may write to the shared lexicon at all, or should land in
  a per-user or quarantined namespace that a curation step promotes.
- A failed synthesis still consumes reserved budget with no refund. This is
  recorded in the schema as deliberate; confirm it is still the intent once the
  budget is user-visible.
- R2 objects are publicly readable by hash-derived URL. Not enumerable, but
  worth an explicit decision about egress before the catalogue grows.

### Acceptance criteria

- A documented worst-case daily cost exists for each provider, and the code
  cannot exceed it without a code change.
- Reaching a cap is observable without inspecting runtime logs.
- Shared lexicon and object storage cannot be grown by an ordinary account
  beyond a stated bound.

## Phase 9: account lifecycle and data operations

**Priority:** P1  
**Estimate:** 1-2 days

The privacy policy tells people to email for export and deletion, so a manual
operator workflow is the promise, not a self-service feature. But nothing in the
repository can carry that workflow out, and doing it by hand against Postgres
would miss rows.

- Add a maintainer script for account export and account deletion, and document
  the procedure. Deletion must be verifiable, not a best-effort sequence of
  ad-hoc statements.
- Handle the tables that a `User` delete will not cascade, because they have no
  foreign key to `User`: `VerificationToken`, `LexemeTranslationConfirmation`
  (it stores a `userId` with no relation), `LlmUsage`, `TtsUsage`, and
  `RateLimit`. Decide per table whether it is deleted, anonymized, or
  deliberately retained.
- Keep the shared-lexicon retention behaviour the privacy page already
  describes, and make the script's behaviour match that text exactly.
- Document Neon backup and point-in-time restore in the repository's own
  operations notes. Today the only description of it lives in an agent skill
  file, which is not where a maintainer will look during an incident.
- Add a restore rehearsal step: a documented, tried path from a Neon branch back
  to a working local application.

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
- parallel translation and speech requests against the daily budgets, asserting
  the ceiling actually holds;
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

There is no logging foundation to extend: production code reports failures with
bare `console.error` calls and no structured payload, correlation id, or level
convention. So the first item is a decision, not an addition.

- Choose the logging shape before adding events: whether to take a dependency on
  a logger or to standardise a small local helper, and what fields every event
  carries. Without that, "add structured events" produces a second ad-hoc style
  next to the first.
- Add structured events for review persistence failures, idempotency conflicts,
  lesson-save failures, auth/token failures, database latency, translation
  latency, and lexicon cache hits/misses.
- Add alerts with actionable thresholds rather than relying on short-retention
  runtime-log inspection.
- Keep Vercel Analytics and Speed Insights, and add an error tracker only after
  defining data-scrubbing and environment separation.
- Exclude the deterministic test account from product analytics where feasible.

## Open decisions

These are choices for the maintainer, not tasks. Each one is currently a
deliberate position in the repository that a phase above would reverse, so it
should be decided rather than quietly changed.

- **Preview deployments.** Phase 6 proposes enabling pull-request previews, but
  `vercel.json` disables every branch except `main` on purpose and `CLAUDE.md`
  describes branches as free to sit on precisely because they do not deploy.
  Enabling previews trades that for a URL to test against, and previews of a
  branch that runs `prisma migrate deploy` against a shared database need a
  database branch to be safe.
- **CI as a gate.** Phase 6 proposes requiring tests, lint, type checking, and
  build before merge. Today CI is documented as a smoke alarm that blocks
  nothing, and it does not run type checking at all — there is no `typecheck`
  script, and the README's claim that `tsc --noEmit` runs in CI is not true.
  Making CI a gate means adding that script and accepting slower merges.
- **Node and npm pinning.** `package.json` already pins `node >=22` and
  `npm ^10`, and CI uses Node 22. Only the Vercel project setting is out of
  step, so Phase 6's item is one dashboard change plus a verification, not a
  repository change.
- **Client-supplied grading.** Phase 1 records the trust decision rather than
  fixing it. That is reasonable for a self-study product, but it means practice
  and lesson scores are an honour system; state whether that is permanent.

## Related plans

Other plans in `docs/plans/` overlap this one and should not be executed
against it blindly.

- `progress-page-redesign.md` proposes redesigning `/progress`, which sits
  directly against this document's finding that the UI is coherent and needs no
  redesign. Both can be true — one is a product bet, the other a reliability
  audit — but Phase 4's progress-query work and that redesign touch the same
  code and should be sequenced deliberately.
- `lexicon-expansion.md` covers the same subsystem as Phase 3. Check what it
  already landed before starting the lexicon work.
- `nav-ia.md` and `three-fixes-table-and-cues.md` overlap Phase 7's product
  polish.

## Recommended execution order

1. Phase 0: test infrastructure, test fixture, and authenticated E2E foundation.
2. Phase 8: paid-provider spend ceilings.
3. Phase 1: learning and course data integrity.
4. Phase 2: reliable client writes.
5. Phase 3: lexicon correctness and latency.
6. Phase 5: auth, rate limiting, and security.
7. Phase 4: query and rendering performance.
8. Phase 9: account lifecycle and data operations.
9. Phase 6: runtime and deployment safety.
10. Phase 7: product decisions and design polish.

Phase 8 moves near the front because it is the only class of defect that costs
money while it goes unfixed, and because it is small. Phase 5 moves ahead of
Phase 4 because correctness and abuse resistance outrank latency on a project
with few users. Phases 0, 8, 1, and 2 form the minimum reliability milestone.
Performance work should follow only once its baseline metrics and test coverage
exist.
