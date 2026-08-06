import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = "demo@slova.app";
  const password = "demo1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
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

  console.log("Seeded user:", email, "/", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
