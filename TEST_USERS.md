# Accounts

Sign-in is **Google only** — there are no passwords to hand out, and no
registration form. Signing in with a Google account creates the matching row in
`User` on the first callback.

## Local development

1. Put `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in `.env` (see `.env.example`).
2. The OAuth client must list `http://localhost:3000/api/auth/callback/google`
   as an authorised redirect URI, or Google refuses the round trip.
3. `npm run db:seed` attaches a starter deck to `demo@slova.app`. To get that
   deck under the account you actually sign in with, run
   `SEED_EMAIL=you@gmail.com npm run db:seed`.
