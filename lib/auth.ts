import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getPrisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Google],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Sessions are JWTs, so there is no adapter writing users for us. On the
     * first callback of a sign-in (`user` is only set then) we upsert the
     * Google account into our own User table and put that row's id — not
     * Google's — in the token, because every deck hangs off it.
     */
    async jwt({ token, user }) {
      if (!user?.email) return token;

      const dbUser = await getPrisma().user.upsert({
        where: { email: user.email.toLowerCase() },
        update: { name: user.name, image: user.image },
        create: {
          email: user.email.toLowerCase(),
          name: user.name,
          image: user.image,
        },
      });

      token.sub = dbUser.id;
      token.picture = dbUser.image;
      return token;
    },
  },
});
