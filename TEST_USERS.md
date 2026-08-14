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
