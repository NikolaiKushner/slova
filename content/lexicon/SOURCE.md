# Where the seed lexicon comes from

Two files, two different origins, and the difference matters if the shared base
is ever handed out rather than just served.

## `en-frequency.txt` — the word list (input)

The 10,000 most common English words, from
[first20hours/google-10000-english](https://github.com/first20hours/google-10000-english)
(`google-10000-english-usa-no-swears.txt`), fetched 2026-08-11.

Chain of provenance, as that repository states it: derived from the **Google Web
Trillion Word Corpus** (Brants and Franz, distributed by the Linguistic Data
Consortium as LDC2006T13), via subsets published by Peter Norvig, cleaned up by
Josh Kaufman.

Its licence note, quoted rather than paraphrased:

> Educational and personal/research use of this data is permitted under the LDC
> license, Norvig's MIT license for his contributions, and US fair use doctrine.
> I do not recommend using this data for commercial purposes without licensing
> it from the Linguistic Data Consortium.

**Worth knowing before Slova ever charges money.** Today it is a personal,
free project, which is squarely inside what that permits. If it starts taking
payments, this list is the thing to revisit — either license the corpus from the
LDC or rebuild the ordering from a public-domain one. Nothing else in the
pipeline is affected: the list is an *input*, and replacing it changes which
words get seeded, not how.

Filtering applied on the way in, which is all the editing we do:

- only `[a-z]+`, so no numbers, hyphens or markup fragments;
- two letters and up — a single letter is not vocabulary;
- a small denylist of web-corpus artefacts (`www`, `pdf`, `href`, `nbsp`, …),
  which a crawl counts as words and nobody studies.

9,822 words survive of 9,884.

### What the second pass refused

`npm run lexicon:build -- --missing` asked about the 1,649 words the first run
left blank. 63 came back with a gloss (`the` as «определённый артикль»); the
other **1,576** were declined on purpose. They are proper nouns, brands, place
names and abbreviations (`john`, `microsoft`, `uk`, `rss`). A learner who
pastes those still goes through the ordinary miss path. The file is not
missing rows; those words are not vocabulary.

## `en-ru-frequency.jsonl` — the translations (output)

**Ours.** Produced by `npm run lexicon:build`, which sends the word list through
the Anthropic Batch API using the same model and the same prompt the app uses at
runtime (`lib/llm/prompt.ts`). No third-party translation set is involved, so no
share-alike obligation attaches to this file, and the base could be published or
moved without inheriting anyone's licence.

Two consequences of using the runtime prompt rather than a separate one:

- a word the model declines to translate comes back empty and is **dropped**,
  never stored as a blank translation — an empty answer cached as an answer
  would be permanent and would stop the word from ever being asked about again;
- seeded and organically-added translations read the same way, because they were
  produced by the same instructions. A user cannot tell which is which, which is
  the point.

Rebuilding: `npm run lexicon:build` (costs roughly $0.50 and takes up to an hour
through the Batch API), then `npm run db:seed-lexicon` to load it. Both are
idempotent — re-running replaces `source="seed"` rows and leaves everything the
lexicon has since earned by itself (`llm`, `import`) alone.

### Line format

A line is `{"text", "translation"}` plus two optional fields:

```json
{"text":"water","translation":"вода","transcription":"ˈwɔːtər","partOfSpeech":"noun"}
```

`transcription` is IPA without slashes; `partOfSpeech` is one of the closed
vocabulary in `PARTS_OF_SPEECH` (`lib/llm/prompt.ts`). Both are **optional in
the file and required in the schema** — structured outputs has no notion of an
optional property, so the model answers `""` where it has nothing, and the
parser leaves the field off the entry rather than storing a blank. A blank
stored in the column would read as "we looked and there is none", which is the
same trap the empty-translation rule above exists to avoid.

Lines written before these fields existed stay valid and load unchanged.

### Filling them in

`npm run lexicon:build -- --enrich` reads this file rather than the word list,
asks only about lines that are missing a field, and rewrites the file in place
in its original order. The stored translation is kept even though the model
returns one: the schema requires the field, but a re-translation would revise
meanings that have already been seeded, reviewed and shipped, and that is not
what an enrichment pass is for.

Three modes, and they do not overlap:

| Flag | Population | Writes |
|---|---|---|
| *(none)* / `--force` | the whole word list | replaces the file |
| `--missing` | words with no line yet | appends |
| `--enrich` | lines missing a transcription or part of speech | rewrites in place |
| `--resume <id>` | with `--missing` or `--enrich` | collects an already-submitted batch instead of creating one |

## `en-irregular-verbs.jsonl` — the triples

Hand-curated. Ninety-five verbs, each with a past and a participle, plus
`acceptPast` on `be` so `were` counts next to `was`. `npm run db:seed-lexicon`
writes those onto `Lexeme.forms` after loading the frequency file. The same
table is the factual core of the irregular-verbs course.
