import type { NextAuthConfig } from "next-auth";

/** Where a signed-in person lands. Everything else in the app hangs off here. */
export const SIGNED_IN_HOME = "/tasks/today";

/**
 * Every top-level segment under `app/(app)`, plus the routes that redirect
 * into it. Matched on a segment boundary, so `/tasks-archive` would not
 * accidentally inherit `/tasks`'s protection.
 */
const PROTECTED_PREFIXES = [
  "/tasks",
  "/practice",
  "/courses",
  "/dictionary",
  "/study",
  "/home",
  "/import",
] as const;

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const isAuthPage = pathname.startsWith("/login");
      const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

      if (isProtected) return isLoggedIn;
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL(SIGNED_IN_HOME, request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
