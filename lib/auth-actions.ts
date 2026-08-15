"use server";

import { headers } from "next/headers";

import {
  completePasswordReset,
  confirmEmailAddress,
  registerAccount,
  requestPasswordReset,
  type AuthActionResult,
} from "@/lib/auth-password";
import { allowAttemptDurable } from "@/lib/rate-limit";
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

export async function registerAction(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const ip = await clientIp();
  if (!(await allowAttemptDurable(`register:ip:${ip}`, 8, HOUR_MS))) {
    return { ok: false, error: "tooManyAttempts" };
  }
  return registerAccount(email, password);
}

export async function requestPasswordResetAction(
  email: string,
): Promise<AuthActionResult> {
  const ip = await clientIp();
  if (!(await allowAttemptDurable(`reset:ip:${ip}`, 8, HOUR_MS))) return { ok: true };
  if (!(await allowAttemptDurable(`reset:email:${normalizeEmail(email)}`, 5, HOUR_MS))) {
    return { ok: true };
  }
  return requestPasswordReset(email);
}

export async function completePasswordResetAction(
  email: string,
  token: string,
  password: string,
): Promise<AuthActionResult> {
  return completePasswordReset(email, token, password);
}

export async function confirmEmailAction(
  email: string,
  token: string,
): Promise<AuthActionResult> {
  return confirmEmailAddress(email, token);
}
