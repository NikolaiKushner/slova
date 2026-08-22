# Plans

A plan is written before the code and lives here while the work is open. When
it ships it **moves to `shipped/`** — see the Plans section of `CLAUDE.md` for
the move and the reference fix-up. Twenty comments across the codebase cite a
plan by section number; that only works because shipped plans stay readable.

## Open, in the order they should land

Ordering is not a preference. Two constraints force what is left: the three
grammar courses share five files and a paid audio manifest and must never run
in parallel, and the first phrase pack needed the word/phrase split ahead of
it or the dictionary bar would start lying.

| # | Plan | Size | Depends on |
|---|---|---|---|
| 1 | [past-simple.md](past-simple.md) | L, content | — |
| 2 | [phrases.md](phrases.md) | M, content | — |
| 3 | [present-continuous.md](present-continuous.md) | L, content | row 1 merged first |
| 4 | [comparatives.md](comparatives.md) | L, content | row 3 merged first. **Owns the six-course catalog threshold** |
| 5 | [dialogues.md](dialogues.md) | L | the budget decision in its §2.1 |

Rows 1, 3 and 4 are three ~2 100-line JSON courses. Phrases sits between the
first and second of them on purpose: back-to-back course writing is the
"quality goes stale around item 60" risk those plans name, at three times the
scale.

Both prerequisites are gone: the activity spine and the Reader shipped
together, so Phrases no longer waits on anything and Dialogues has both the
spine and the tokenizer it measures with.

If only one thing gets done: Past Simple. It makes an already-shipped course
worth more.

[speaking.md](speaking.md) is **closed, not open**: its spike ran, the browser
recogniser scored 58% on the single words the drill would have asked for, and
steps 2–5 are shelved on that evidence. The plan stays here rather than in
`shipped/` because nothing shipped — read its §8a before anyone proposes
speech again.

## Shipped

`shipped/` holds fifteen plans behind the current app — Stories, Grammar
Review, the Reader and the activity spine it stands on, the nav rebuild, the
lexicon expansion, the iPad keyboard work, the landing page, the pre-release
cleanup, and the project-review roadmap whose seven phases produced much of the
reliability work. They are the reasoning behind code that is live, and several
are cited directly from source comments.

`shipped/reader.md` carries two sections worth reading before the next
section is designed: §10 is the three things the build found that the design
did not predict, and §11 is why the tokenizer output is recomputed rather than
stored, with the measurements.

## Conventions worth copying

Read a neighbouring plan before writing a new one. Three habits in particular
have already paid for themselves:

- **A mechanical guard before the content.** `comparatives.md` writes a unit
  test that fails on any adjective from a banned list *before* a single
  exercise exists, because the schema cannot read English and neither can a
  tired reviewer.
- **A skeleton whose failing invariant is the to-do list.** The grammar courses
  register a pack that `loadCourse` rejects on exercise counts, then fill it.
- **Name the outcome that kills the plan.** `speaking.md` says which spike
  result means the section is not built, and `dialogues.md` says which
  measurement sends it back to an authored-branching design. A plan that
  cannot fail is not a plan.

Plans in this directory are written in English, matching the rest of `docs/`;
`shipped/landing-from-mockup.md` is in Russian, which is the exception rather
than the rule.
