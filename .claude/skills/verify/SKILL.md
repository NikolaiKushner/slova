# Verify Slova (Next.js)

Build and smoke-check the Next.js + Prisma app when the user explicitly asks to verify in a browser.

## Rules

- Only use this skill when the user asks to verify / try the app in a browser.
- Prefer CI for routine checks; this is for interactive end-to-end verification.

## Steps

1. Ensure `.env` exists (`cp .env.example .env` if needed).
2. `npx prisma migrate deploy` (or `migrate dev` locally).
3. `npm run db:seed` if no demo user.
4. `npm run build && npm run start` (or `npm run dev`).
5. Open http://localhost:3000 — sign in with Google or email and password.
6. Paste a short word list, study once, confirm home due counts update.
