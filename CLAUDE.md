# Working on Slova

Guidance for AI agents (and humans) contributing to this repo.

## Change flow: commit to `main`

This is a solo project. Work lands on `main` directly — no feature branches,
no integration branches, no PRs for ordinary work.

- Commit to `main` and `git push`. That is the whole flow.
- `main` still refuses deletion and force-pushes. Nothing else blocks a push,
  so nothing is waiting on a review that is never coming.
- Branch and open a PR only when the change genuinely wants a second look
  before it deploys — a risky migration, a spike, something you want to sit on.
  Then merge it yourself; no approval is required and none should be waited for.
- Keep tests in `tests/unit` in step with code changes.

## Verification

`main` auto-deploys to Vercel, and nothing gates the push any more. So the
cheap check moved locally, and the slow ones stayed in CI:

- **Run `npm test` before pushing to `main`.** It is vitest over `tests/unit`
  and takes seconds. This is the one local check that is worth its cost, and it
  is now the only thing standing between a typo and production.
- **Still do not run the dev server, e2e tests, or browsers in agent sessions.**
  Those are slow, flaky, and CI does them better.
- CI (`.github/workflows/ci.yml`) runs on every push to `main`: unit tests →
  Prisma generate → production build. It no longer blocks anything — treat it
  as a smoke alarm. If it goes red, fix forward with another commit.

## Design system

- Read `DESIGN.md` before any UI change.
- Colors and radii go through design tokens / Tailwind theme — hardcoded hex
  in components is forbidden unless documented in `DESIGN.md` first.
- Prefer light, calm layouts: paste → study → due, not dense dashboards.

## Project notes

- Next.js App Router + Route Handlers + Prisma/SQLite; see README.md.
- Demo user from `npm run db:seed`: `demo@slova.app` / `demo1234`.
- After editing `prisma/schema.prisma`, run `npx prisma migrate dev` and
  commit the migration.
