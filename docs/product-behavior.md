# Product behavior decisions

## Daily new-word allowance

The daily new-word allowance resets at midnight in the learner's configured
timezone. The same timezone cookie drives the study queue, study summaries,
set availability, study-sitting snapshots, progress dates, and streak dates.

If the cookie is absent or invalid, the application falls back to UTC. This
keeps server behavior deterministic while a client timezone has not yet been
recorded.

Changing timezone can therefore move the current daily boundary. It does not
restore words already introduced or alter their review schedule; it only
changes which calendar day contains those introductions when calculating the
remaining allowance.
