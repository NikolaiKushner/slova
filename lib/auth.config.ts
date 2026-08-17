import type { NextAuthConfig } from "next-auth";

/** Where a signed-in person lands. Everything else in the app hangs off here. */
export const SIGNED_IN_HOME = "/practice";

/** Public auth screens. Signed-in people get sent home from these. */
export const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

/**
 * Every top-level segment under `app/(app)`, plus the routes that redirect
 * into it. Matched on a segment boundary, so `/tasks-archive` would not
 * accidentally inherit `/tasks`'s protection.
 */
export const PROTECTED_PREFIXES = [
  "/tasks",
  "/practice",
  "/courses",
  "/dictionary",
  "/study",
  "/home",
  "/import",
  "/progress",
] as const;

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const isAuthPage = AUTH_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
      );
      const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

      if (isProtected) return isLoggedIn;
      if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
        return isLoggedIn;
      }
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
