import type { Adapter, AdapterUser } from "next-auth/adapters";

import { getPrisma } from "@/lib/prisma";

/**
 * Auth.js needs a database for magic-link tokens, and once an adapter is
 * attached it also writes Google accounts there. Each method calls getPrisma()
 * at request time — constructing the client at import hangs Auth.js (it
 * inspects the object it is handed) and also demands DATABASE_URL during
 * `next build`.
 */
function toAdapterUser(user: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
}): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
  };
}

export const authAdapter: Adapter = {
  async createUser(data) {
    const created = await getPrisma().user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        image: data.image,
        emailVerified: data.emailVerified,
      },
    });
    return toAdapterUser(created);
  },

  async getUser(id) {
    const user = await getPrisma().user.findUnique({ where: { id } });
    return user ? toAdapterUser(user) : null;
  },

  async getUserByEmail(email) {
    const user = await getPrisma().user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? toAdapterUser(user) : null;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    const account = await getPrisma().account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    return account ? toAdapterUser(account.user) : null;
  },

  async updateUser(data) {
    const prisma = getPrisma();
    const update = {
      name: data.name,
      image: data.image,
      email: data.email?.toLowerCase(),
      emailVerified: data.emailVerified,
    };
    if (data.emailVerified) {
      // With Google, Auth.js verifies the address before linkAccount. Strip a
      // password that was never inbox-verified in the same transition, or an
      // address squat would become a working credentials account.
      await prisma.user.updateMany({
        where: { id: data.id, emailVerified: null },
        data: { ...update, passwordHash: null },
      });
    }
    const updated = await prisma.user.update({
      where: { id: data.id },
      data: update,
    });
    return toAdapterUser(updated);
  },

  async linkAccount(account) {
    const prisma = getPrisma();
    await prisma.$transaction(async (transaction) => {
      if (account.provider === "google") {
        await transaction.user.updateMany({
          where: { id: account.userId, emailVerified: null },
          data: { emailVerified: new Date(), passwordHash: null },
        });
      }
      await transaction.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state:
            typeof account.session_state === "string"
              ? account.session_state
              : undefined,
        },
      });
    });
  },

  async createVerificationToken(data) {
    return getPrisma().verificationToken.upsert({
      where: { identifier: data.identifier },
      create: data,
      update: { token: data.token, expires: data.expires },
    });
  },

  async useVerificationToken({ identifier, token }) {
    try {
      return await getPrisma().verificationToken.delete({
        where: { identifier_token: { identifier, token } },
      });
    } catch {
      return null;
    }
  },
};
