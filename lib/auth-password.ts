import { getPrisma } from "@/lib/prisma";
import {
  confirmEmailCopy,
  resetEmailCopy,
  sendAppEmail,
} from "@/lib/auth-email";
import {
  appOrigin,
  consumeToken,
  issueToken,
} from "@/lib/auth-tokens";
import { registrationPlan } from "@/lib/auth-policy";
import {
  hashPassword,
  isEmail,
  normalizeEmail,
  passwordIssue,
} from "@/lib/password";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function sendConfirmEmail(email: string) {
  const token = await issueToken("verify", email);
  const url = `${appOrigin()}/verify-email?${new URLSearchParams({ email, token })}`;
  const copy = confirmEmailCopy(url);
  await sendAppEmail({ to: email, ...copy });
}

async function sendResetEmail(email: string) {
  const token = await issueToken("reset", email);
  const url = `${appOrigin()}/reset-password?${new URLSearchParams({ email, token })}`;
  const copy = resetEmailCopy(url);
  await sendAppEmail({ to: email, ...copy });
}

export async function registerAccount(
  emailRaw: string,
  password: string,
): Promise<AuthActionResult> {
  if (!isEmail(emailRaw)) {
    return { ok: false, error: "Enter a valid email address." };
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
      error: "An account with this email already exists. Sign in.",
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
        error: "An account with this email already exists. Sign in.",
      };
    }
  }

  try {
    await sendConfirmEmail(email);
  } catch {
    return { ok: false, error: "Could not send the confirmation email." };
  }
  return { ok: true };
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<AuthActionResult> {
  if (!isEmail(emailRaw)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const email = normalizeEmail(emailRaw);
  const user = await getPrisma().user.findUnique({ where: { email } });
  if (user) {
    try {
      await sendResetEmail(email);
    } catch {
      return { ok: false, error: "Could not send the reset email." };
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
    return { ok: false, error: "That reset link is invalid." };
  }
  const issue = passwordIssue(password);
  if (issue) return { ok: false, error: issue };

  const email = normalizeEmail(emailRaw);
  const used = await consumeToken("reset", email, token);
  if (!used) {
    return {
      ok: false,
      error: "That reset link has expired. Ask for a new one.",
    };
  }

  await getPrisma().user.updateMany({
    where: { email },
    data: {
      passwordHash: await hashPassword(password),
      emailVerified: new Date(),
    },
  });
  return { ok: true };
}

export async function confirmEmailAddress(
  emailRaw: string | undefined,
  token: string | undefined,
): Promise<AuthActionResult> {
  if (!emailRaw || !token || !isEmail(emailRaw)) {
    return { ok: false, error: "That confirmation link is invalid." };
  }

  const email = normalizeEmail(emailRaw);
  const used = await consumeToken("verify", email, token);
  if (!used) {
    return {
      ok: false,
      error: "That confirmation link has expired. Create the account again.",
    };
  }

  await getPrisma().user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });
  return { ok: true };
}
