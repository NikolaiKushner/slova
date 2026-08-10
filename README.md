# Slova

**Paste a word list. Start learning.**

You got a sheet from your tutor, a CSV from class, or a messy note with words and translations. Slova turns that into something you can study in minutes — then quietly brings words back when it’s time to review.

Not another deck manager. The job is simple: get words in, learn them, come back.

## How it works

1. **Paste a list** — lines like `hello — привет`, tabs, or commas. Preview, import, done.
2. **Study** — flip a card, tap *Know it* or *Again*.
3. **Come back** — due words show up on your home screen. Short sessions beat long ones.

Paste 200 words and you won't get 200 cards on day one: Slova introduces up to
20 unseen words a day and holds the rest back, so a big import still starts as
a short session.

That’s the whole loop for now.

## Who it’s for

Anyone learning vocabulary from real materials — tutors, courses, travel lists — who doesn’t want to rebuild every set by hand in a heavy flashcard app.

## What’s next

The core is “list → study → review.” Later we may grow into:

- a **daily micro-habit** (a few minutes, not a marathon)
- words from **life** (chat, article, trip) — not only tutor packs
- light **challenges** on top of the same cards
- a **dictionary-diary** with your own notes and examples

## Try it locally

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed   # demo@slova.app / demo1234
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## For contributors

Stack: Next.js, React, TypeScript, Tailwind, shadcn/ui, Auth.js, Prisma, SQLite.

| Script | What |
|--------|------|
| `npm run dev` | Dev server |
| `npm test` | Unit tests |
| `npm run build` | Production build |
| `npm run db:migrate` | Migrations |
| `npm run db:seed` | Demo user |

UI changes: read [DESIGN.md](DESIGN.md) first. Agent notes: [CLAUDE.md](CLAUDE.md). Demo accounts: [TEST_USERS.md](TEST_USERS.md).
