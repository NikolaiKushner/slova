# Working plan — temporary

Delete this file once both features have shipped. Durable rules live in
`CLAUDE.md` and `DESIGN.md`; research lives in `research/`.

---

## Where things stand (2026-08-11)

**Branch `chore/deploy-guardrails`** — two commits ahead of `main`, verified
locally (81 unit tests, `tsc`, eslint clean), **not merged, not deployed**:

- `AUTH_URL` validation in the deploy preflight — rejects a trailing dot in the
  hostname, a path where an origin belongs, and plain http off localhost.
- Dependabot ignores major version updates; security advisories still open PRs.
- `lib/normalize.ts` — cleans pasted and machine-translated words.

**Open decisions, unanswered:**

1. Merge `chore/deploy-guardrails` into `main`? (Merging deploys to production.)
2. Dependabot PRs: #29 is the grouped minor+patch bump and looks mergeable;
   #30 (ESLint 10), #31 (@types/node 26) and #32 (TypeScript 7) are majors that
   the new ignore rule would have prevented — close them?

**Known and deliberately unfixed:** three `react-hooks/set-state-in-effect`
errors in `components/app-search.tsx` and `hooks/use-mobile.ts`. They predate
this work and CI does not lint. Worth a separate pass that also adds lint to
the workflow.

---

## Feature 1 — Translate a whole table in one request

### The problem

`app/api/translate/route.ts:37-46` loops over the batch, hitting MyMemory once
per word with `await sleep(120)` between calls. At the 40-word cap that is 40
sequential round trips plus ~4.7s of deliberate sleeping. This — not the choice
of engine — is why filling a pasted lesson feels slow.

Quality fails on the same axis. MyMemory translates *sentences*, so an isolated
word comes back guessed: `accuracy → точности` (genitive), `monitor patients →
пациентов.` (fragment), `medical records → ISTORIIA BOLEZNI` (transliterated).
`lib/normalize.ts` already scrubs the artefacts and refuses transliteration,
but it cannot recover a wrong case or a missing word.

### The shape

Split by **batch vs single row**, not by document vs word:

- **Batch** (`Translate empty`, or a freshly pasted list) → one LLM request for
  every empty row. Fewer round trips than today, and the model sees the whole
  list as context, so a medical vocabulary sheet reads as medical vocabulary.
- **Single row** (`Fill` on one word) → one request either way; latency is
  already low. Keep MyMemory here as the free default.

### Latency levers, in order of effect

| Lever | Effect | Cost |
|---|---|---|
| One request for N words instead of N | Removes N−1 round trips and all the sleeping | — |
| `output_config: {effort: "low"}` | Default is `high`; translation is not intelligence-sensitive | — |
| Structured outputs (`output_config.format`) | Parseable array, no preamble, no retry loop. First request per schema pays a compile; cached 24h after | — |
| Streaming | Total time unchanged, but rows fill visibly instead of a spinner | — |
| Haiku 4.5 instead of Opus 5 | Fastest tier | $1/$5 vs $5/$25 per MTok — **user's call, do not downgrade unasked** |
| Fast mode (`speed: "fast"`, beta) | Up to 2.5× output tokens/sec | Opus 5/4.8 only, Claude API only, $10/$50 per MTok |

Batch API is the wrong tool: half price but asynchronous, up to 24 hours.

### Steps

1. `lib/translate-llm.ts` — one function taking the rows needing translation and
   returning `{ text, translation }[]` via a single Anthropic call. Structured
   output schema, `effort: "low"`, English→Russian pinned per `DESIGN.md`.
2. Extend `POST /api/translate` with an engine choice; batch defaults to the LLM,
   single text keeps MyMemory. Keep the response shape so `import-form.tsx`
   needs no change beyond wiring.
3. `ANTHROPIC_API_KEY` becomes a required env var — add it to
   `scripts/check-env.mjs` and `.env.example`, and set it on Vercel.
4. Run `lib/normalize.ts` over the model's output too. It should be a no-op on
   good output; if it is not, the prompt needs fixing, not the normalizer.
5. Unit-test the pure parts (prompt assembly, response mapping). Do not test
   against the live API.

### Open questions

- Which model — Opus 5 by default, or Haiku 4.5 for speed and cost?
- Does the single-row `Fill` stay on MyMemory, or move to the LLM for
  consistency once the key exists anyway?

---

## Feature 2 — Paste a lesson, get a study set

Backed by `research/brainstorm-table-paste-import-2026-08-10.md` (bets 1 and 2).
Evidence there is thin on market demand and explicitly flagged `single-source`;
it is strong on the technical route.

### The key finding

Screenshots are a false lead for the first version. Both sample documents are
things you can copy text from, and copying from Word, Pages or Google Docs puts
**HTML on the clipboard**: the W3C Clipboard API requires `text/html` in the
paste event when the clipboard carries it. So the paste handler gets a real
`<table>` with exact cells — no guessing where a column ended. Heuristics over
tabs and spaces break on `was / were` and on multi-line bulleted cells; parsing
the HTML table does not.

Column language detection is a unicode range, not ML: Cyrillic versus Latin by
majority of characters in the column.

### The two cases to handle

**Irregular verbs** (4 columns: Infinitive / Past Simple / Past Participle /
Перевод). Three English columns collapse into one `front` (`be · was/were ·
been`), the Russian column becomes `back`.

**Themed vocabulary** (columns AI / Hospital / Collocations / Idioms, no
translations, bulleted multi-line cells). Columns become rows; the column
heading goes into the existing `Card.source` field; empty translations are
filled by Feature 1.

### Steps

1. `lib/parse-clipboard-table.ts` — pure: HTML string in, rows out. No DOM
   dependency beyond a parser, so it is unit-testable against fixtures saved
   from the two real screenshots.
2. Paste handler in `import-form.tsx` reads `text/html` first, falls back to the
   existing `parseImportText` on plain text (PDF often carries no HTML).
3. Language detection per column; merge same-language columns into `front`.
4. Column-to-rows expansion for the translation-less case, filling `source`.
5. Feed the result through `normalizeRow` and into the existing table. The user
   reviews before import — that stays true.

### Non-goals for this pass

OCR. The polished shelf is already crowded (Sticky, viewlog, EveryWord,
WordSnap, Flash AI), and it only matters for material you cannot copy text from
— a photo of paper. If it happens later it is image → text → *this same
parser*, with an editable result.

### Open question

What should a 4-column irregular-verb row become — one card asking all three
forms, or three cards? This touches the card model, not just the import.
