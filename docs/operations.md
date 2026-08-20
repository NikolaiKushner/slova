# Operations runbook

This runbook covers session-replay lookups, manual account-data requests, and
Lakebase Postgres recovery.
Commands that read or administer a database use the direct Neon connection
(`DATABASE_URL_UNPOOLED`), never the pooled application URL.

## Identifying a session replay

LogRocket receives a user id and nothing else, so a replay names an account the
database can resolve but LogRocket cannot. Read-only, and it runs in either
direction:

```bash
npm run account:whois -- --id cmsxphye100005cy0htg9b9q3
npm run account:whois -- --email person@example.com
```

The second form produces the id to paste into LogRocket's session search when a
complaint arrives from an address. Treat the output as personal data: it belongs
in the operator's environment, not in an issue or a chat.

## Account data requests

The privacy policy promises a manual workflow through `contact@slova.study`.
There is intentionally no self-service export or deletion endpoint.

### Before handling a request

1. Confirm that the request arrived from the account email. If it did not, ask
   the requester to prove control of that address before disclosing or deleting
   anything.
2. Record the request date, verified email, operator, and requested action in
   the private operations log. Do not copy exported personal data into the log.
3. Pull the current production `DATABASE_URL_UNPOOLED` into the operator's
   environment. Never paste it into a command, issue, chat, or repository file.
4. For deletion, create a named Neon snapshot or confirm that the requested
   point is inside the configured restore window before executing the command.

### Export

Write the export outside the repository to an encrypted or otherwise
access-controlled directory:

```bash
npm run account:data -- export \
  --email person@example.com \
  --output /secure/operator/path/slova-account-export.json
```

The command refuses to overwrite an existing file unless `--overwrite` is
supplied and creates a new file with mode `0600`. The JSON contains the account,
dictionary, set membership, study history, course progress, provider usage, and
the user's links to shared translations. It deliberately excludes password
hashes, OAuth access/refresh/ID tokens, and one-time token hashes.

Inspect the file only enough to verify the email and format, deliver it through
the agreed private channel, then remove the operator copy according to the
private request log's retention policy.

### Deletion

First print the deletion plan. This command does not mutate the database:

```bash
npm run account:data -- delete --email person@example.com
```

Compare the normalized email and row counts with the approved request. Then run
the destructive step with both safeguards:

```bash
npm run account:data -- delete \
  --email person@example.com \
  --execute \
  --confirm person@example.com
```

Deletion runs in one serializable transaction. After commit, the script queries
every account-owned and non-foreign-key table again and fails unless every
reported count is zero. Save the non-sensitive count summary in the private
operations log; never save the export itself there.

### Retention decisions

| Data | Action | Reason |
| --- | --- | --- |
| `User` and foreign-key descendants | Delete by cascade | Removes email, OAuth accounts, words, sets, reviews, sittings, and course progress. |
| `VerificationToken` | Delete | The policy promises removal of tokens; rows have no `User` foreign key. |
| `LlmUsage` and `TtsUsage` | Delete | Per-user cost and usage history is account-linked and disposable. Global TTS rows are unaffected. |
| Account-specific `RateLimit` keys | Delete | Email and user-ID counters are attributable to the account. IP and shared audio-generation keys are not uniquely attributable and expire through normal cleanup. |
| `LexemeTranslationConfirmation` | Delete the user link | Removes the remaining association between a person and a shared translation. |
| `Lexeme` / `LexemeTranslation` and aggregate confirmation count | Retain | The privacy policy says shared translations remain after account deletion and are no longer tied to the person. Removing the link without decrementing the historical aggregate preserves that exact behavior. |

If a requester explicitly asks to remove a shared translation as well, treat it
as a separate moderation request. Review other confirmations and downstream
impact before changing shared lexicon rows; the account deletion command does
not perform that action.

## Neon backup and point-in-time recovery

Neon retains branch history for instant restore according to the project's
configured restore window. Check and adjust it under **Project settings →
Restore window**. The current defaults and plan limits can change, so verify
them in the [Neon project settings documentation](https://neon.com/docs/manage/projects#configure-restore-window).

The **Backup & Restore** page combines point-in-time restore with snapshots.
Use a descriptive snapshot before account deletion, high-risk migrations, or
bulk maintenance. Scheduled snapshots and their retention depend on the active
Neon plan; see the [Neon backup and restore announcement](https://neon.com/docs/changelog/2025-10-31#snapshots-now-in-beta-with-automated-scheduling).

For an incident:

1. Stop the application or otherwise stop writes when continued mutation could
   widen the incident.
2. Record the suspected bad-change timestamp in UTC and the production branch.
3. In **Backup & Restore**, use preview/time-travel queries to find the last
   known-good timestamp. Compare the schema as well as representative row
   counts.
4. Create a temporary branch from that point first. Do not replace production
   until the temporary branch passes the rehearsal below.
5. If production must be restored, select the explicit production target and
   wait for every Neon restore operation to finish before reconnecting the app.
   A finalized restore preserves the endpoint connection string but changes the
   active branch ID and leaves the previous branch orphaned; retrieve the new
   branch ID and clean up the old branch only after verification. The detailed
   behavior is documented in [Neon database versioning](https://neon.com/docs/ai/ai-database-versioning#rolling-back-to-restoring-a-snapshot).
6. Run migrations only if the chosen application commit expects migrations
   newer than the restored database. Always use the direct connection.
7. Run `npm run restore:verify`, deploy or start the matching application
   commit, and perform the authenticated smoke path before reopening writes.

For an independent logical archive, use `pg_dump`/`pg_restore` with direct
connection strings. Never use a `-pooler` hostname. Neon's supported command
shape is documented in [Migrate data from another Neon project](https://neon.com/docs/import/migrate-from-neon).

## Restore rehearsal

Create a temporary Neon branch from the intended timestamp and obtain both its
pooled and direct connection strings. Keep these variables in the current shell
or an ignored local environment file:

```bash
export RESTORE_DATABASE_ENVIRONMENT=restore-rehearsal
export RESTORE_DATABASE_URL=postgresql://...-pooler.../...
export RESTORE_DATABASE_URL_UNPOOLED=postgresql://...direct.../...
npm run restore:verify
```

The verifier is read-only. It refuses an environment named `production`, checks
that Prisma migration history is complete, and reads the core account,
dictionary, set, and review tables through the same Prisma/Neon stack as the
application.

Then point a temporary local shell at the rehearsal branch, build the matching
commit, start the app, and complete the authenticated smoke path from
`docs/testing.md`. Do not run mutation tests against a branch retained for
forensics.

The repository rehearsal was last run on 2026-08-18 against the isolated Neon
test branch with:

```bash
npm run restore:verify -- --test-environment
```

That verifies the branch-to-local application connection and schema path. A
production incident rehearsal should additionally exercise the point-in-time
branch creation step in the Neon console and record its branch ID and timestamp
in the private operations log.
