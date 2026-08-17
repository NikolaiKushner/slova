# Slova

A vocabulary app for one direction: **English word, Russian translation.** You
paste a list, the translations fill themselves in, and then you practise until
the words stick. Grammar courses sit beside the dictionary: short rules, then
the same kind of question the trainings use.

The part worth explaining is the middle one. Translating a pasted list used to
mean one HTTP request per word to a free translation service, with a deliberate
pause between them — forty round trips and about five seconds of sleeping for a
typical lesson. Now a list is answered in **one** request, and most of the time
in none at all: the words come out of a shared dictionary that already holds
**more than 8,000 English words with translations and recorded pronunciations**,
and only what is missing reaches a model.

## How it works

**The shared base is a cache, never the authority.** `Lexeme` and
`LexemeTranslation` hold what everybody gets; a translation you type stays
yours until a second, independent source agrees with it. One person's typo must
not become the app's answer for a word, and there is no moderation to catch it
if it does.

**A word belongs to you, not to a list.** `UserWord` is one row per word per
person, with its own schedule; `WordSetItem` files it under as many sets as you
like. A word in three sets is learned once, not three times — which is the
whole reason sets are tags rather than folders.

**A miss is paid for once.** When the model does translate something, the
answer goes into the shared base, so the next list containing that word is free.
Seeding the frequency core cost about a dollar; a miss costs a hundredth of a
cent.

**On-demand pronunciation is off by default.** When
`TTS_ON_DEMAND_ENABLED=true`, the authenticated `/api/audio` endpoint accepts
one explicit text of at most 200 characters. It checks `Lexeme` first, then
atomically reserves a small daily request-and-character budget before calling
OpenAI and uploading to R2. Failed paid-path attempts stay reserved, so retries
cannot turn a provider outage into an unlimited bill.

**The scheduler is FSRS.** Three numbers per word — how long the memory lasts,
how hard that word is for you, how likely you are to recall it now — instead of
one ease factor and a fixed multiplier.

**The chrome is bilingual.** Russian or English, remembered in a cookie, no
locale in the URL. Teaching material stays as it is: English words, Russian
grammar explanations.

## Screens

| Where | What |
|---|---|
| **Trainings** | Six formats plus Brainstorm. The source (sets and due/new/hard) is chosen once, at the top of the page. This is where you land after sign-in |
| **Grammar** | Present Simple and *to be*; the rest of the A1–B1 shelf is Coming soon |
| **My words** | Everything you have — search, filter, sort, edit, bulk actions |
| **My sets** | Sets as tags, not folders |

Seven ways to be asked a word: recognise it, recognise it backwards, hear it
and choose, assemble it from letters, hear it and write it, write it from the
meaning — and **Brainstorm**, which walks new words up that ladder and does not
let one go until it has been through cleanly.

Everything runs from the keyboard: `1`–`4` pick an option, letters build a
word, `Enter` submits and moves on.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values it describes
npx prisma migrate deploy
npm run db:seed                # a demo account and a few words
npm run dev
```

Demo account from the seed: `demo@slova.app`. Sign in with that email
(Google, or register a password), or run `SEED_EMAIL=you@gmail.com npm run db:seed`.

`.env.example` documents every variable. `ANTHROPIC_API_KEY` is required.
OpenAI and R2 credentials are required by `npm run check:env` only when
`TTS_ON_DEMAND_ENABLED=true`; they remain server-only and must never use a
`NEXT_PUBLIC_*` name.

CI and Vercel install with **npm 10** (Node 22). A lockfile written by npm 11
fails `npm ci` there. After clone, `npm install` turns on a pre-commit hook
that checks the lockfile the way CI does, then runs `npm test`.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests over `tests/unit` — seconds, and the one check worth its cost |
| `npm run lint` / `npx tsc --noEmit` | Also run in CI |
| `npm run db:seed` | Demo user and a small set |
| `npm run lexicon:build` | Translate the frequency list through the Batch API |
| `npm run db:seed-lexicon` | Load that dataset into the shared base |
| `npm run lexicon:audio` | Record every word and upload it to R2 |

The last three cost money and are run by hand, once. `content/lexicon/SOURCE.md`
records where the word list came from and under what terms.

## Stack

Next.js App Router, Prisma over Neon Postgres, NextAuth with Google and
email/password, next-intl, shadcn/ui on base-ui. Claude Haiku 4.5 for
translation, OpenAI `tts-1` for pronunciation, Cloudflare R2 for the audio
files. Deployed on Vercel from `main` (`slova.study`).

## Licence

MIT, with one carve-out: `content/lexicon/en-frequency.txt` comes from a corpus
that is not mine to relicense, and reaches you under its own terms — personal
and educational use, commercial use not recommended without licensing it from
the LDC. `NOTICE` states the exception; `content/lexicon/SOURCE.md` explains
where the file came from and how to replace it if that matters to you.

## If you are going to change something

Read **`CLAUDE.md`** first — how work reaches `main`, and what to run before it
does. Then **`docs/design-system.md`**, before touching anything visual; it is
the reason the screens look like one app, and it outranks the code where the
two disagree. **`docs/MIGRATION.md`** is the record of the interface rebuild
and the checklist a screen still has to pass.
