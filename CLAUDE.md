# Working on Slova

Guidance for AI agents (and humans) contributing to this repo.

## Change flow: branch, accumulate, then merge

`main` auto-deploys, so **every push to `main` is a release**. Work does not go
there directly.

- Create a branch, and keep committing to it across several changes — it is a
  staging area for a batch of work, not one commit per branch.
- Verify locally before merging: `npm test`, and a production build if anything
  touched the build, schema or environment.
- Merge to `main` when the batch is genuinely ready to ship, and ask first
  unless the maintainer already said to go.
- Branches do not get preview deploys (`vercel.json` allows only `main`), so a
  branch costs nothing to sit on.
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
- **Vercel does gate.** `buildCommand` runs `npm run vercel:preflight` first —
  environment check, unit tests, then `prisma migrate deploy`. Any of the three
  failing fails the build, and a failed build never replaces the live
  deployment. Tests catch code; `scripts/check-env.mjs` catches the missing
  variable that otherwise shows up as an opaque Prisma or NextAuth error.

## Design system

- Read `DESIGN.md` before any UI change.
- Build UI from shadcn/ui components — never hand-roll a control in raw HTML
  and never write custom CSS to fake one. Missing primitive? Install it with
  `npx shadcn@latest add <name>`.
- Colors and radii go through design tokens / Tailwind theme — hardcoded hex
  in components is forbidden unless documented in `DESIGN.md` first.
- Prefer light, calm layouts: paste → study → due, not dense dashboards.

## Project notes

- Next.js App Router + Route Handlers + Prisma/SQLite; see README.md.
- **npm is the package manager.** `package-lock.json` is the only lockfile —
  CI runs `npm ci` and Vercel infers npm from it. Never commit a second
  lockfile: Vercel prefers `pnpm-lock.yaml` when present, which silently
  installs a different dependency set from CI.
- Vercel deploys **only `main`** (`vercel.json` → `git.deploymentEnabled`).
  Branches get CI, not preview deployments.
- Demo user from `npm run db:seed`: `demo@slova.app` (Google, or register a password).
- After editing `prisma/schema.prisma`, run `npx prisma migrate dev` and
  commit the migration.
