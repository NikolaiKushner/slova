import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

/**
 * Must stay in step with PROTECTED_PREFIXES in lib/auth.config.ts. It cannot
 * import that array — Next reads this config statically at build time — so a
 * unit test compares the two instead. That test exists because these once
 * drifted: the matcher still listed /home, /decks and /import for a while
 * after those routes had moved.
 */
export const config = {
  matcher: [
    "/tasks/:path*",
    "/practice/:path*",
    "/courses/:path*",
    "/dictionary/:path*",
    "/study/:path*",
    "/home/:path*",
    "/import/:path*",
    "/login",
  ],
};
