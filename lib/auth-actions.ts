"use server";

import { headers } from "next/headers";

import {
  completePasswordReset,
  confirmEmailAddress,
  registerAccount,
  requestPasswordReset,
} from "@/lib/auth-password";
import { allowAttempt } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/password-rules";

const HOUR_MS = 60 * 60 * 1000;

async function clientIp() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export async function registerAction(email: string, password: string) {
  const ip = await clientIp();
  if (!allowAttempt(`register:ip:${ip}`, 8, HOUR_MS)) {
    return { ok: false, error: "Too many attempts. Try again in a while." };
  }
  return registerAccount(email, password);
}

export async function requestPasswordResetAction(email: string) {
  const ip = await clientIp();
  if (!allowAttempt(`reset:ip:${ip}`, 8, HOUR_MS)) return { ok: true };
  if (!allowAttempt(`reset:email:${normalizeEmail(email)}`, 5, HOUR_MS)) {
    return { ok: true };
  }
  return requestPasswordReset(email);
}

export async function completePasswordResetAction(
  email: string,
  token: string,
  password: string,
) {
  return completePasswordReset(email, token, password);
}

export async function confirmEmailAction(email: string, token: string) {
  return confirmEmailAddress(email, token);
}
