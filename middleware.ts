import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/home/:path*",
    "/decks/:path*",
    "/import/:path*",
    "/study/:path*",
    "/login",
  ],
};
