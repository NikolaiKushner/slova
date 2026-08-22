# Plans

A plan is written before the code and lives here while the work is open. When
it ships it **moves to `shipped/`** — see the Plans section of `CLAUDE.md` for
the move and the reference fix-up. Twenty comments across the codebase cite a
plan by section number; that only works because shipped plans stay readable.

## Open, in the order they should land

Rows 1 and 2 are written and waiting on review in `feat/word-phrase-split`;
everything below them is untouched.

Ordering is not a preference. Three constraints force most of it: the three
grammar courses share five files and a paid audio manifest and must never run
in parallel; the reader's tokenizer is what the dialogue plan measures with;
and the word/phrase split has to precede the first phrase pack or the
dictionary bar starts lying.

| # | Plan | Size | Depends on |
|---|---|---|---|
| 1 | [progress-activity.md](progress-activity.md) step 5 | S | — |
| 2 | [reader.md](reader.md) | L | 1 |
| 3 | [past-simple.md](past-simple.md) | L, content | — |
| 4 | [phrases.md](phrases.md) | M, content | progress-activity step 5 |
| 5 | [present-continuous.md](present-continuous.md) | L, content | row 3 merged first |
| 6 | [comparatives.md](comparatives.md) | L, content | row 5 merged first. **Owns the six-course catalog threshold** |
| 7 | [dialogues.md](dialogues.md) | L | rows 1 and 2, and the budget decision in its §2.1 |

Rows 3, 5 and 6 are three ~2 100-line JSON courses. Phrases sits between the
first and second of them on purpose: back-to-back course writing is the
"quality goes stale around item 60" risk those plans name, at three times the
scale.

If only two things get done: `progress-activity` steps 4–5, and Past Simple.
The first spends measurement already sitting in the database; the second makes
an already-shipped course worth more.

[speaking.md](speaking.md) is **closed, not open**: its spike ran, the browser
recogniser scored 58% on the single words the drill would have asked for, and
steps 2–5 are shelved on that evidence. The plan stays here rather than in
`shipped/` because nothing shipped — read its §8a before anyone proposes
speech again.

## Shipped

`shipped/` holds thirteen plans behind the current app — Stories, Grammar
Review, the nav rebuild, the lexicon expansion, the iPad keyboard work, the
landing page, the pre-release cleanup, and the project-review roadmap whose
seven phases produced much of the reliability work. They are the reasoning
behind code that is live, and several are cited directly from source
comments.

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
