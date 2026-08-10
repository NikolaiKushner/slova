import { prisma } from "../lib/prisma";

async function main() {
  // Sign-in is Google-only, so this seeds data shape, not a way in: use the
  // email of the Google account you sign in with to see the starter deck.
  const email = process.env.SEED_EMAIL ?? "demo@slova.app";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo",
    },
  });

  const existing = await prisma.deck.findFirst({
    where: { userId: user.id, title: "Starter words" },
  });

  if (!existing) {
    const deck = await prisma.deck.create({
      data: {
        title: "Starter words",
        userId: user.id,
        cards: {
          create: [
            { front: "hello", back: "привет" },
            { front: "thanks", back: "спасибо" },
            { front: "please", back: "пожалуйста" },
          ],
        },
      },
    });
    console.log("Created starter deck:", deck.id);
  }

  console.log("Seeded user:", email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
