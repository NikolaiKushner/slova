import Anthropic from "@anthropic-ai/sdk";

/**
 * The one place the SDK is constructed.
 *
 * Lazily, and deliberately: the constructor throws when `ANTHROPIC_API_KEY` is
 * missing, and a module-level `new Anthropic()` would turn that into a build
 * failure on every page that transitively imports this file — including the
 * ones that never translate anything. Built on first call instead, so only the
 * request that actually needs a key pays for its absence.
 *
 * Also the seam. Moving to a gateway, or to another provider, is a change to
 * this file and nothing else.
 */

let client: Anthropic | null = null;

export function llm(): Anthropic {
  if (!client) {
    client = new Anthropic({
      // The SDK reads ANTHROPIC_API_KEY itself; naming it here keeps the
      // dependency visible to whoever greps for the variable.
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

/** Test seam: forget the singleton so the next call reads the environment again. */
export function resetLlmClient(): void {
  client = null;
}
