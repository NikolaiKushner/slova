# Paid-provider spend ceilings

The runtime uses two paid APIs. Both have an app-wide UTC-day ceiling in code,
in addition to per-account and burst limits. Environment variables may lower a
global ceiling, but `activeGlobalLimits` and `activeGlobalTtsLimits` clamp any
higher value back to the code-owned maximum. Raising a ceiling therefore
requires a reviewed code change.

Pricing below was checked on 2026-08-18 against the official
[Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing),
[Anthropic token-counting](https://platform.claude.com/docs/en/build-with-claude/token-counting),
and [OpenAI TTS-1](https://developers.openai.com/api/docs/models/tts-1)
pages. Provider prices can change independently of this repository; the usage
ceilings do not.

## Anthropic translation

The hard global maximum is 50 inference requests, 100,000 input tokens, and
60,000 output tokens per UTC day. Before inference, the route:

1. asks the free token-counting endpoint for the request's input estimate;
2. takes the larger of that estimate plus margin and a conservative bound based
   on the serialized UTF-8 request size;
3. atomically reserves one request, that input amount, and the complete
   `max_tokens` output ceiling on both the global and account rows; and
4. after a successful response, returns only the difference between the
   reservation and provider-reported usage.

A failed or interrupted inference keeps its full reservation. This can deny
later work earlier than necessary, but cannot turn an uncertain provider result
into overspend. Parallel calls cannot reserve past any conditional SQL bound.

`LLM_MODEL` is restricted to the closed capability map in `lib/llm/models.ts`.
At current prices, the default Claude Haiku 4.5 ceiling is **$0.40/day**:

- 100,000 input tokens × $1 / million = $0.10;
- 60,000 output tokens × $5 / million = $0.30.

The most expensive selectable model in the current map costs $5 / million
input tokens and $25 / million output tokens, so the deployment-wide worst
case across every permitted `LLM_MODEL` value is **$2.00/day**. Selecting an
unknown model falls back to Haiku; adding a more expensive model requires code.

## OpenAI on-demand speech

The hard global maximum is 100 requests and 10,000 characters per UTC day. The
request and character counters are reserved atomically before synthesis and
are deliberately never refunded after provider, upload, or database failure.
At TTS-1's current $15 / million-character price, the provider maximum is
**$0.15/day**.

On-demand synthesis is allowed only when a matching shared `Lexeme` already
exists and lacks normal audio. It updates that row; it never inserts a lexeme.
The R2 key is deterministic for the canonical lexeme text, so retries overwrite
the same object. An ordinary account can therefore cause at most one normal
audio object per existing shared lexeme, and cannot expand the catalogue with
arbitrary text. Offline curation scripts remain the only path that can add
catalogue entries in bulk.

R2 audio URLs are intentionally public and immutable. They are hash-derived and
not enumerable, but possession of a URL is sufficient to read it. This is
accepted because the objects contain only pronunciation of already-public
shared catalogue text, not account-owned input.

## Durable cap alerts

A denied reservation records `capReachedAt`, `capReason`, and `capAttempts` on
the affected daily usage row. This state survives runtime-log retention.

Run `npm run budget:status` to print the current global usage, dimensions that
have exactly reached their limits, and all denied-reservation alerts for today.
Pass `-- --day YYYY-MM-DD` for another UTC day. The command exits with status 2
when a dimension is exhausted or an alert exists, so an external scheduler or
deployment monitor can treat exhaustion as an actionable failure without
scraping application logs.
