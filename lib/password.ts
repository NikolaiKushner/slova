/**
 * Password hashing. Node crypto — do not import this from a client
 * component. Length checks live in password-rules.ts, which is safe
 * on both sides.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEY_LENGTH = 32;

export {
  isEmail,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  passwordIssue,
} from "@/lib/password-rules";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
