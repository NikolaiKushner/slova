export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

export function passwordIssue(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return "That password is too long.";
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  const value = normalizeEmail(email);
  if (value.length > 254) return false;
  if (value.includes('"')) return false;
  const parts = value.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes(".");
}
