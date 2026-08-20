# Accounts

Sign-in is **email and password**, **Google**, or both on the same address.
Registration emails a confirmation link. There is a forgot-password flow.

## Local development

1. Put `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in `.env` (see `.env.example`).
2. The OAuth client must list `http://localhost:3000/api/auth/callback/google`
   as an authorised redirect URI, or Google refuses the round trip.
3. Put `AUTH_RESEND_KEY` and `AUTH_EMAIL_FROM` in `.env`. Confirm and reset
   emails go out through Resend. Until the sending domain is verified,
   `AUTH_EMAIL_FROM` must be `Resend <onboarding@resend.dev>` and the link
   only arrives at the address you signed up to Resend with.
4. `npm run db:seed` attaches a starter deck to `demo@slova.app`. To get that
   deck under the account you actually sign in with, run
   `SEED_EMAIL=you@gmail.com npm run db:seed`.

## Automated authenticated fixture

Automated tests use a separate credentials account and never depend on email
delivery or Google OAuth. Configure an isolated Neon branch in the ignored
`.env.test.local` file as documented in `docs/testing.md`. For an automated
browser run, use:

```bash
npm run test:e2e
```

That command includes `db:prepare-test`. Run `npm run db:prepare-test` by itself
when an agent or maintainer wants the same fixture for manual browser work.

The seed is a reset, not an append. It restores one empty set, one populated
set, due and new words, a partially studied word, partial Present Simple
course progress, and four weak grammar rules that are due for Grammar Review. The account is email-verified and its password is hashed by
the same helper as normal registration. Playwright signs in through `/login`
and writes reusable authenticated state only to the gitignored
`playwright/.auth` directory.

Running the seed twice does not create duplicates. It requires the explicit
`TEST_DATABASE_URL` and `TEST_DATABASE_ENVIRONMENT` variables and refuses a
production target unless `E2E_ALLOW_PRODUCTION_SEED=true` is deliberately set.
