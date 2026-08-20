import { isEmail, normalizeEmail } from "@/lib/password-rules";

/**
 * Which end of the mapping the operator is holding. A session replay shows a
 * user id and nothing else — deliberately, so LogRocket never receives an
 * address — so the id has to be resolvable here. The reverse direction is the
 * same lookup run backwards: given a complaint from an address, produce the id
 * to paste into LogRocket's session search.
 */
export type WhoisTarget =
  | { by: "id"; id: string }
  | { by: "email"; email: string };

const USAGE = "Usage: account:whois -- --id <user-id> | --email <address>";

export function parseWhoisTarget(args: readonly string[]): WhoisTarget {
  const options = new Map<string, string>();
  const rest = [...args];

  while (rest.length > 0) {
    const flag = rest.shift()!;
    if (flag !== "--id" && flag !== "--email") {
      throw new Error(`Unexpected argument: ${flag}. ${USAGE}`);
    }
    const value = rest.shift();
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}. ${USAGE}`);
    }
    if (options.has(flag)) throw new Error(`${flag} given twice. ${USAGE}`);
    options.set(flag, value);
  }

  if (options.size !== 1) throw new Error(USAGE);

  const id = options.get("--id")?.trim();
  if (id) return { by: "id", id };

  const email = normalizeEmail(options.get("--email")!);
  if (!isEmail(email)) throw new Error(`Not an email address: ${email}`);
  return { by: "email", email };
}
