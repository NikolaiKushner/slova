# Working on Slova

Guidance for AI agents (and humans) contributing to this repo.

## Change flow: branch, accumulate, then merge

`main` auto-deploys, so **every push to `main` is a release**. Work does not go
there directly.

- Create a branch, and keep committing to it across several changes — it is a
  staging area for a batch of work, not one commit per branch.
- Name every feature branch `feat/<slug>` (e.g. `feat/stories`). Non-feature
  work (a fix, a chore) may use its own prefix, but a feature branch is always
  `feat/`.
- Verify locally before merging: `npm test`, and a production build if anything
  touched the build, schema or environment.
- **Do not commit before the maintainer has reviewed the change.** Passing
  tests are necessary, not sufficient — present the diff and wait for the
  maintainer to check the implementation themselves before it goes into a
  commit. This applies per logical unit of work, not just before merging to
  `main`.
- Merge to `main` when the batch is genuinely ready to ship, and ask first
  unless the maintainer already said to go.
- Branches do not get preview deploys until Preview has an isolated Neon
  database (`vercel.json` allows only `main`). See `docs/deployment.md`.
- Keep tests in `tests/unit` in step with code changes.

## Plans

Work worth more than a session gets a plan in `docs/plans/<slug>.md` before it
gets code. `docs/plans/README.md` is the index and the running order.

**A shipped plan moves to `docs/plans/shipped/`. It is never deleted.**

Deleting them was the old habit and it cost something concrete: twenty comments
across the codebase cite a plan by section — `lib/stories/load.ts` points at
`docs/plans/shipped/stories.md` §6.2 for a constant, `content/stories/schema.ts`
at §5.1 for a field-by-field rationale — and for a while every one of those
pointers led nowhere. A plan is the long-form reasoning the Comments section
below tells you to keep out of the code; that only works if it stays readable.

So, when a plan ships:

```bash
git mv docs/plans/<slug>.md docs/plans/shipped/<slug>.md
grep -rl "docs/plans/<slug>.md" --exclude-dir=node_modules --exclude-dir=.git .
```

Fix every hit, set `Status: shipped <date>` at the top of the moved file, and
drop its row from the index. `app/generated` is ignored and regenerates, so
Prisma doc comments only need fixing in `prisma/schema.prisma`.

## Verification

`main` auto-deploys to Vercel. The project currently has one maintainer, so CI
is intentionally a smoke alarm rather than a required pull-request gate; local
checks catch errors before a round trip to CI:

- **Run `npm test` before pushing to `main`.** It is vitest over `tests/unit`
  and takes seconds.
- **A pre-commit hook runs `npm run check:lockfile` then `npm test`.** The
  lockfile check uses npm 10, the same major CI and Vercel use. Local npm 11
  will happily `npm ci` a lockfile that GitHub's npm 10 rejects. `npm install`
  after clone sets `core.hooksPath` to `.githooks/`.
- **Running the dev server and driving a browser is allowed** — and expected
  for UI work. A screen that has only been type-checked has not been checked:
  the layout, the keyboard and the sound all fail in ways `tsc` cannot see.
  Open the screen and look at it before saying it works, then **stop the
  server**. Anything behind the login is reached through the Playwright
  fixture — `npm run dev:test` plus `npx playwright test --project=setup`,
  which signs in for you; see "Looking at an authenticated screen" in
  `docs/testing.md`. Never type credentials into the form by hand. Automated
  e2e suites still belong in CI, not in a session.
- CI (`.github/workflows/ci.yml`) runs unit tests, lint, TypeScript, and a
  production build. The database-backed job remains isolated from the fast
  quality job. Reconsider making it a required status check when another person
  begins shipping changes.
- **Vercel does gate.** `buildCommand` runs `npm run vercel:preflight` first —
  environment check, unit tests, then read-only migration status. Any of the three
  failing fails the build, and a failed build never replaces the live
  deployment. Production migrations are applied separately before merge; see
  `docs/deployment.md`.

## Design system

The interface follows `docs/design-system.md`.
Read that file before any UI change.
Colours, sizes, radii, shadows — only through tokens in `app/globals.css`.
Hardcoded hex, sizes off the type scale, and hand-rolled versions of what
shadcn/ui already has, are not accepted.

- `docs/design-system.md` — the specification, the single source of truth.
  It outranks habit: if the code diverges from the document, rewrite the code.
- `docs/MIGRATION.md` — record of the interface rebuild and the screen
  checklist. The rebuild is done; the checklist still applies.
- `docs/tokens.html` — visual cheat sheet for the tokens, opens in a browser.
- `docs/globals.reference.css` — token reference. `app/globals.css` diverges
  from it only where the divergence is marked with a comment and explained.
- Build UI from shadcn/ui components — never hand-roll a control in raw HTML
  and never write custom CSS to fake one. Missing primitive? Install it with
  `npx shadcn@latest add <name>`.

## Comments

Write code that reads without them. No file-header essays, no paragraph above
a function restating its name, no note explaining a line that is already
plain, no §-references to the design system beside every class name.

A comment earns its place only where the code cannot say the thing itself: a
workaround for someone else's bug, a constant whose value came from a
measurement, an order of operations that looks wrong and is not. One line
then, not a paragraph.

**Do not take the density of comments in existing files as the target.** Much
of this repo is over-commented; that is history, not house style. Reasoning
that explains a decision belongs in `docs/`, where it can be read on its own.

**One line each, and few of them.** A comment longer than one line needs a
reason it could not be one; a file needing more than two or three is telling
you the code is unclear, and the fix is the code. Before writing one, ask what
a reader would get wrong without it — if the answer is "nothing", delete it.
Explaining what a module is for is never that case: that is the plan's job.

This rule is aimed at agents in particular, and it does not hold on its own —
the microphone probe was written the same day this section was last edited and
still arrived with a ten-line header and twenty-two lines of commentary.
**Re-read the diff for comments before presenting it**, and cut there rather
than trusting that the habit stayed away.

## Project notes

- Next.js App Router + Route Handlers + Prisma over Neon Postgres; see README.md.
- **npm is the package manager.** `package-lock.json` is the only lockfile —
  CI runs `npm ci` and Vercel infers npm from it. Never commit a second
  lockfile: Vercel prefers `pnpm-lock.yaml` when present, which silently
  installs a different dependency set from CI.
- Vercel deploys **only `main`** until Preview has an isolated database
  (`vercel.json` → `git.deploymentEnabled`). Branches get CI, not preview
  deployments.
- Demo user from `npm run db:seed`: `demo@slova.app` (Google, or register a password).
- After editing `prisma/schema.prisma`, run `npx prisma migrate dev` and
  commit the migration.
