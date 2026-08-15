import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import type en from "@/messages/en.json";

type ErrorKey = keyof typeof en.errors;

const ERROR_KEYS = new Set<string>(
  Object.keys({
    invalidEmail: 1,
    passwordTooShort: 1,
    passwordTooLong: 1,
    passwordsMismatch: 1,
    emailExists: 1,
    confirmEmailFailed: 1,
    resetEmailFailed: 1,
    resetLinkInvalid: 1,
    resetLinkExpired: 1,
    confirmLinkInvalid: 1,
    confirmLinkExpired: 1,
    tooManyAttempts: 1,
    CredentialsSignin: 1,
    email_not_verified: 1,
    AccessDenied: 1,
    OAuthAccountNotLinked: 1,
    Configuration: 1,
    signInFailed: 1,
  } satisfies Record<ErrorKey, 1>),
);

export function formatAuthError(
  t: (key: ErrorKey, values?: { count: number }) => string,
  code: string,
): string {
  if (code === "passwordTooShort") {
    return t("passwordTooShort", { count: MIN_PASSWORD_LENGTH });
  }
  if (ERROR_KEYS.has(code)) return t(code as ErrorKey);
  return t("signInFailed");
}
