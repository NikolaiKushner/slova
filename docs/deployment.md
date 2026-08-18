# Deployment operations

## Supported toolchain

Slova uses Node.js 22 and npm 10.9.9 in local development, GitHub Actions,
and Vercel. The repository records this in `.nvmrc`, `package.json`, and the CI
workflow. Vercel's project-level Node.js setting must also remain on `22.x`.

Use the pinned npm version when changing dependencies:

```bash
nvm use
npx --yes npm@10.9.9 install
npm run check:lockfile
```

## CI verification

The `Quality gate` job runs unit tests, lint, TypeScript, and the production
build. The project currently has one maintainer, so the default-branch ruleset
does not require pull requests or this status check. Treat the job as a smoke
alarm and run the same checks before pushing to `main`. Revisit a required
status check when another person begins shipping changes. The database-backed
job remains separate because it creates and deletes an isolated Neon branch
and needs repository secrets.

Preview deployments stay disabled in `vercel.json` until Preview has its own
Neon branch. Production and Preview currently receive the same managed Neon
connection variables; enabling branch deployments in that state would allow
preview code and browser tests to write to production. Once an isolated Preview
database is attached, change `git.deploymentEnabled` and verify the full
authenticated flow before relying on preview URLs.

## Production migrations

Vercel builds never apply schema changes. `vercel:preflight` performs a
read-only `prisma migrate status` check and refuses to deploy application code
while a committed migration is pending.

For a release containing a migration:

1. Make the migration backward-compatible with both the current production
   application and the incoming application. Use expand/contract changes for
   renames, removals, and required columns.
2. Take or confirm a recent Neon restore point as described in
   `docs/operations.md`.
3. From the reviewed release commit, apply the migration separately:

   ```bash
   vercel env run -e production -- npm run db:migrate:deploy
   vercel env run -e production -- npm run db:migrate:status
   ```

4. Merge the same commit to `main`. Vercel then builds and deploys it only if
   the environment, unit tests, and migration-status check pass.
5. Remove obsolete columns or compatibility code in a later release, after the
   expanded schema has been live and verified.

Never run production DDL through the pooled connection. `prisma.config.ts`
prefers `DATABASE_URL_UNPOOLED` for migration commands.

## Environment-variable audit

Audit names and targets without pulling or printing values:

```bash
vercel env ls
```

Application-owned variables are documented in `.env.example`. Neon-managed
`POSTGRES_*`, `PG*`, and `NEON_*` aliases may not appear in application source;
leave them under integration ownership. Remove an application-owned variable
only after `rg` confirms that neither runtime code nor maintainer scripts use
it, and after checking that no external deploy hook consumes it.

The 2026-08-18 audit removed `BLOB_READ_WRITE_TOKEN` because Slova stores audio
in Cloudflare R2. All Neon integration aliases were retained.

## Dependency advisories

Run audits with the pinned npm version. The repository overrides Nano ID to
`3.3.18` or later within its existing major line, resolving
`GHSA-2v37-7h3g-55p8` without changing PostCSS consumers.

Prisma CLI currently brings `deepmerge-ts@7` through `@prisma/config`. npm's
automated recommendation is a Prisma 7 to Prisma 6 downgrade, so it must not be
applied. Track the upstream Prisma dependency and update when Prisma ships a
compatible fix; the affected merge helper is tooling-only and is not called on
untrusted runtime request data.

## Build cache

The production build inspected on 2026-08-18 uploaded a 526.37 MB cache in
7.858 seconds. Local inspection attributed the large reusable directories to
Next.js/Turbopack and the Prisma toolchain rather than application assets. Keep
watching upload time after dependency changes; do not disable the cache while
it remains a single-digit-second upload.
