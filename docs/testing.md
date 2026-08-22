# Test environments

Slova keeps its three test layers separate. `npm test` is the fast, pure unit
suite and must never connect to a database. Database integration tests and
browser tests have explicit commands and configuration of their own.

## Local database integration tests

Use an isolated Neon branch that contains no production data. Put its pooled
and direct connection strings in an ignored `.env.test.local` file:

```dotenv
TEST_DATABASE_URL="postgresql://...-pooler.../slova_test?sslmode=require"
TEST_DATABASE_URL_UNPOOLED="postgresql://.../slova_test?sslmode=require"
TEST_DATABASE_ENVIRONMENT="test"
E2E_TEST_USER_EMAIL="learner@slova.test"
E2E_TEST_USER_PASSWORD="a-long-test-only-password"
```

Vitest loads `.env.test.local` in test mode. Prepare a fresh database and run
the integration suite:

```bash
npm run db:prepare-test
npm run test:integration
```

`db:prepare-test` applies committed migrations through the direct connection,
then resets the deterministic fixture through the pooled connection. Neither
step falls back to the application's database variables.

The integration setup requires `TEST_DATABASE_URL` and deliberately overwrites
`DATABASE_URL` inside the test process. It never falls back to the application's
database variable. The suite seeds the fixture twice and verifies that the
second run restores the same two sets, four words, and partial course progress
without duplicates.

## Playwright

Install Chromium once, then run the browser suite. The command migrates the test
database, resets the test user, starts the local Next.js development server
against `TEST_DATABASE_URL`, signs in through the credentials form, and saves
authenticated state under the gitignored `playwright/.auth` directory:

```bash
npx playwright install chromium
npm run test:e2e
```

Set `E2E_BASE_URL` to target an already-running local or staging deployment.
That deployment must use the same database named by `TEST_DATABASE_URL`.
Reports, traces, screenshots, and authenticated storage state are all
gitignored. Re-running `npm run db:seed-test-user` is the cleanup/reset command;
it removes only the configured test user's dependent data and recreates the
fixture.

The seed refuses a database labelled `production`, a production Vercel
environment, or a production-looking URL. `E2E_ALLOW_PRODUCTION_SEED=true` is
the explicit override for an approved smoke account and must not be a default
CI variable. Test migrations never accept that override. For an approved
production smoke account, seed it explicitly with `db:seed-test-user`, set
`E2E_BASE_URL`, and invoke `npx playwright test` directly instead of
`npm run test:e2e` so the migration command cannot target production.

## Looking at an authenticated screen

A screen behind the login is checked against the E2E fixture, not the personal
development database, and never by typing a password by hand:

```bash
npm run db:prepare-test          # migrate and reset the fixture learner
npm run dev:test                 # next dev against TEST_DATABASE_URL
npx playwright test --project=setup
```

`dev:test` exists because `npm run dev` serves the development branch, where
the fixture learner does not exist. The setup project reuses the server already
listening on 3000, signs in through the credentials form, and writes cookies to
`playwright/.auth/user.json`; an agent driving its own browser sets those
cookies on `localhost:3000` and reloads. `.claude/launch.json` has the matching
`slova-dev-test` configuration.

The fixture has words, sets and partial course progress, but no study days.
Sittings, review logs and story progress have to be written for the screen
under test; `npm run db:seed-test-user` puts the fixture back afterwards.

**Stop the server when the check is done.** A dev server left running holds
port 3000 and a Neon connection, and the next session starts by fighting it.

## GitHub Actions

The `integration-and-e2e` job creates a fresh Neon branch for every run, applies
migrations, runs both suites, and deletes the branch even after a failure. It is
enabled after these encrypted repository settings exist:

- Actions secret `NEON_API_KEY`.
- Actions secrets `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD`.
- Actions variable `NEON_PROJECT_ID`.
- Actions variable `NEON_TEST_PARENT_BRANCH`, naming a sterile branch that has
  the current schema but no production user data.

The job remains skipped until both variables are present. Pull requests from
forks are skipped because GitHub does not expose repository secrets to them.
