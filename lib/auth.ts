import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getPrisma } from "@/lib/prisma";
import { authAdapter } from "@/lib/auth-adapter";
import { authConfig } from "@/lib/auth.config";
import { googleLinkPasswordHash } from "@/lib/auth-policy";
import {
  isEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/password";
import { allowAttempt } from "@/lib/rate-limit";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: authAdapter,
  providers: [
    Google({
      // Existing users were created by the jwt upsert, with no Account row.
      // Google verifies the address. Linking is safe for already-verified
      // people; unverified password hashes are stripped in the jwt callback
      // so a squat cannot ride Google's verification. Without this flag the
      // first Google sign-in after adding the adapter errors OAuthAccountNotLinked.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!isEmail(emailRaw) || !password) return null;

        const email = normalizeEmail(emailRaw);
        if (!allowAttempt(`login:${email}`, 10, 15 * 60 * 1000)) return null;

        const user = await getPrisma().user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;
        if (!user.emailVerified) throw new EmailNotVerified();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Sessions are JWTs. The adapter now writes User / Account rows, but the
     * token still has to carry our User.id — not Google's — because every
     * deck hangs off it. Upserting by email also covers older Google-only
     * rows that have no Account yet.
     */
    async jwt({ token, user, account }) {
      if (!user?.email) {
        if (user?.id) token.sub = user.id;
        return token;
      }

      const email = user.email.toLowerCase();
      const existing = await getPrisma().user.findUnique({ where: { email } });
      const stripPassword =
        account?.provider === "google"
          ? googleLinkPasswordHash(existing)
          : undefined;

      const dbUser = await getPrisma().user.upsert({
        where: { email },
        update: {
          name: user.name,
          image: user.image,
          ...(account?.provider === "google"
            ? { emailVerified: new Date() }
            : {}),
          ...(stripPassword === null ? { passwordHash: null } : {}),
        },
        create: {
          email,
          name: user.name,
          image: user.image,
          emailVerified:
            account?.provider === "google" ? new Date() : undefined,
        },
      });

      token.sub = dbUser.id;
      token.picture = dbUser.image;
      return token;
    },
  },
});
