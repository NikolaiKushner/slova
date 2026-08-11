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
