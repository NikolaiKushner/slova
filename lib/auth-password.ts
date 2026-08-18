import { getPrisma } from "@/lib/prisma";
import {
  confirmEmailCopy,
  resetEmailCopy,
  sendAppEmail,
} from "@/lib/auth-email";
import {
  appOrigin,
  consumeTokenWithUserUpdate,
  issueToken,
} from "@/lib/auth-tokens";
import { registrationPlan } from "@/lib/auth-policy";
import {
  hashPassword,
  isEmail,
  normalizeEmail,
  passwordIssue,
} from "@/lib/password";
import { DEFAULT_LOCALE, isAppLocale } from "@/lib/i18n/locale";
import { getLocale } from "next-intl/server";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requestLocale() {
  try {
    const locale = await getLocale();
    return isAppLocale(locale) ? locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

async function sendConfirmEmail(email: string) {
  const token = await issueToken("verify", email);
  const url = `${appOrigin()}/verify-email?${new URLSearchParams({ email, token })}`;
  const copy = confirmEmailCopy(url, await requestLocale());
  await sendAppEmail({ to: email, ...copy });
}

async function sendResetEmail(email: string) {
  const token = await issueToken("reset", email);
  const url = `${appOrigin()}/reset-password?${new URLSearchParams({ email, token })}`;
  const copy = resetEmailCopy(url, await requestLocale());
  await sendAppEmail({ to: email, ...copy });
}

export async function registerAccount(
  emailRaw: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isEmail(emailRaw)) {
    return { ok: false, error: "invalidEmail" };
  }
  const issue = passwordIssue(password);
  if (issue) return { ok: false, error: issue };

  const email = normalizeEmail(emailRaw);
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email } });
  const plan = registrationPlan(existing);

  if (plan === "exists" || plan === "google-only") {
    return {
      ok: false,
      error: "emailExists",
    };
  }

  const passwordHash = await hashPassword(password);

  if (plan === "replace-unverified") {
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
  } else {
    try {
      await prisma.user.create({
        data: { email, passwordHash },
      });
    } catch {
      return {
        ok: false,
        error: "emailExists",
      };
    }
  }

  try {
    await sendConfirmEmail(email);
  } catch {
    return { ok: false, error: "confirmEmailFailed" };
  }
  return { ok: true };
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<AuthActionResult> {
  if (!isEmail(emailRaw)) {
    return { ok: false, error: "invalidEmail" };
  }

  const email = normalizeEmail(emailRaw);
  const user = await getPrisma().user.findUnique({ where: { email } });
  if (user) {
    try {
      await sendResetEmail(email);
    } catch {
      return { ok: false, error: "resetEmailFailed" };
    }
  }
  return { ok: true };
}

export async function completePasswordReset(
  emailRaw: string,
  token: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isEmail(emailRaw) || !token) {
    return { ok: false, error: "resetLinkInvalid" };
  }
  const issue = passwordIssue(password);
  if (issue) return { ok: false, error: issue };

  const email = normalizeEmail(emailRaw);
  // Scrypt is intentionally expensive. Finish it before consuming the
  // one-time link so a hashing failure cannot burn an otherwise valid reset.
  const passwordHash = await hashPassword(password);
  const used = await consumeTokenWithUserUpdate("reset", email, token, {
    passwordHash,
    emailVerified: new Date(),
    sessionVersion: { increment: 1 },
  });
  if (!used) {
    return {
      ok: false,
      error: "resetLinkExpired",
    };
  }

  return { ok: true };
}

export async function confirmEmailAddress(
  emailRaw: string | undefined,
  token: string | undefined,
): Promise<AuthActionResult> {
  if (!emailRaw || !token || !isEmail(emailRaw)) {
    return { ok: false, error: "confirmLinkInvalid" };
  }

  const email = normalizeEmail(emailRaw);
  const used = await consumeTokenWithUserUpdate("verify", email, token, {
    emailVerified: new Date(),
  });
  if (!used) {
    return {
      ok: false,
      error: "confirmLinkExpired",
    };
  }

  return { ok: true };
}
