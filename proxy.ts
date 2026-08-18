import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const proxy = NextAuth(authConfig).auth;

/**
 * Must stay in step with PROTECTED_PREFIXES and AUTH_PATHS in
 * lib/auth.config.ts, plus `/api` (except `/api/auth`, which authorized()
 * leaves open). It cannot import those arrays — Next reads this config
 * statically at build time — so a unit test compares the two instead.
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
    "/progress/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/api/:path*",
  ],
};
