/**
 * Which model we ask, and what that model is willing to be asked.
 *
 * The model is configurable through `LLM_MODEL` so a bad generation can be
 * swapped without a deploy. That freedom is exactly why the capability map
 * exists: request parameters are not uniform across the family, and a
 * parameter a model does not know is a 400, not a shrug. Changing the env var
 * must never produce a request the model rejects.
 */

/** Cheapest and fastest of the family; the whole point of the lexicon is that we call it rarely. */
export const DEFAULT_MODEL = "claude-haiku-4-5";

type ModelCapabilities = {
  /**
   * `output_config.effort`. Present on the reasoning tier (Sonnet 5, Opus 5,
   * Opus 4.5+), absent on Haiku 4.5 and Sonnet 4.5 — and absent there means
   * `invalid_request_error`, not a default. Translating dictionary pairs needs
   * no reasoning depth, so on Haiku we lose nothing by not having the dial.
   */
  supportsEffort: boolean;
};

/**
 * Only models we would plausibly point `LLM_MODEL` at. An unknown id falls
 * back to the conservative shape below rather than failing to boot: a typo in
 * an env var should degrade the request, not the deployment.
 */
const CAPABILITIES: Record<string, ModelCapabilities> = {
  "claude-haiku-4-5": { supportsEffort: false },
  "claude-sonnet-4-5": { supportsEffort: false },
  "claude-sonnet-5": { supportsEffort: true },
  "claude-opus-4-5": { supportsEffort: true },
  "claude-opus-5": { supportsEffort: true },
};

/**
 * What an unrecognised model is assumed to accept: the intersection, not the
 * union. Sending a parameter that turns out to be unsupported fails the whole
 * request; omitting one that was supported only costs a default.
 */
const CONSERVATIVE: ModelCapabilities = { supportsEffort: false };

export function capabilitiesOf(model: string): ModelCapabilities {
  return CAPABILITIES[model] ?? CONSERVATIVE;
}

/** The model this deployment talks to. */
export function activeModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
}
