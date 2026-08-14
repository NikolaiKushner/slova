import { config } from "dotenv";

// Same precedence as prisma.config.ts and Next.js. Without this the script
// only ran when the shell already had DATABASE_URL exported, which is not how
// anybody runs it.
config({ path: [".env.local", ".env"] });

import { getPrisma } from "../lib/prisma";
import { normalizeKey } from "../lib/lexicon/key";

const STARTER = [
  { front: "hello", back: "привет" },
  { front: "thanks", back: "спасибо" },
  { front: "please", back: "пожалуйста" },
];

async function main() {
  // This seeds data shape, not a way in. Sign in with this email (Google, or
  // register a password) to see the starter set.
  const email = process.env.SEED_EMAIL ?? "demo@slova.app";
  const prisma = getPrisma();

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo" },
  });

  const existing = await prisma.wordSet.findFirst({
    where: { userId: user.id, title: "Starter words" },
  });
  if (existing) {
    console.log("Seeded user:", email);
    return;
  }

  const set = await prisma.wordSet.create({
    data: { title: "Starter words", userId: user.id },
  });

  for (const word of STARTER) {
    const saved = await prisma.userWord.upsert({
      where: { userId_key: { userId: user.id, key: normalizeKey(word.front) } },
      update: {},
      create: {
        userId: user.id,
        key: normalizeKey(word.front),
        front: word.front,
        back: word.back,
        source: "seed",
      },
    });
    await prisma.wordSetItem.create({
      data: { wordId: saved.id, setId: set.id },
    });
  }

  console.log("Created starter set:", set.id);
  console.log("Seeded user:", email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
