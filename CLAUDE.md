# Working on Slova

Guidance for AI agents (and humans) contributing to this repo.

## Verification happens on GitHub, not locally

- **Do not run the dev server, unit tests, e2e tests, or browsers in agent
  sessions.** Write the code and push; GitHub Actions is the single
  verification gate.
- CI (`.github/workflows/ci.yml`) runs on every PR and push to `main`:
  unit tests (vitest) → Prisma generate → production build.
- After pushing, check the PR's checks; if CI is red, read the failing job's
  log and fix from there.

## Change flow

- `main` is protected: changes land only through PRs; merge commits only;
  branches auto-delete after merge.
- Develop on the branch designated for the session and push with
  `git push -u origin <branch>`.
- **Never merge a PR yourself** — open it, report, and wait for the
  maintainer's explicit go-ahead.
- Keep tests in `tests/unit` in step with code changes so CI stays green.

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
- Demo user from `npm run db:seed`: `demo@slova.app` / `demo1234`.
- After editing `prisma/schema.prisma`, run `npx prisma migrate dev` and
  commit the migration.
