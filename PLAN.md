# Greg SDK — Implementation Plan

> Audience: an autonomous coding agent with repo, terminal, and web/documentation access.
> This plan states **what must be true**. It deliberately does not say *how* to build it. You are expected to inspect the repo, read current docs/types/source, and make the engineering decisions.

## 1. Goal

`greg-sdk` is an **extension** of Vercel AI SDK v7 (`ai`). It makes model selection and provider configuration simpler while keeping every capability of the underlying SDK reachable. Greg extends the AI SDK; it must never weaken, shrink, or replace it.

Developer experience target: pick a model with one string, pass credentials and endpoint, and get the full AI SDK experience (native result types, options, provider-specific configuration) without installing provider packages by hand.

## 2. Public Contracts (product requirements — non-negotiable)

### 2.1 Model selection: `provider/model_id`

- Split on the **first** `/` only. The first segment is the provider; everything after it, including further slashes, is the model ID.
- `openrouter/openrouter/free` → provider `openrouter`, model `openrouter/free`. Models must never be truncated or re-split at later slashes.
- Define sensible behavior for malformed input (no slash, empty provider, empty model ID, unknown provider). Errors should be clear and actionable; choose the error shape after looking at how the AI SDK reports comparable failures.

### 2.2 Mandatory `apiKey` and `baseUrl`

- Every Greg request requires `apiKey: string` and `baseUrl: string`, for **every** provider. No provider-specific exceptions, no optional variants.
- Where an endpoint needs no auth, a placeholder key is acceptable if the underlying integration allows it.
- Note the naming: Greg's public field is `baseUrl`, while AI SDK provider factories document `baseURL` (see §5). Greg must adapt between them correctly. Do not assume every provider package accepts these under the same names or semantics; verify per provider.
- Decide (and document) how `baseUrl` behaves for providers whose normal base URL is fixed, including any trailing-slash or path-suffix handling.

### 2.3 `compatible/model_name`

- Prefix `compatible/` selects a custom OpenAI-compatible endpoint using the request's `apiKey` and `baseUrl`.
- Model name follows the same first-slash rule (`compatible/org/model` → model `org/model`).
- Use the AI SDK's OpenAI-compatible provider integration for this, not a hand-written HTTP client.

## 3. Feature-Preservation Requirement (most important constraint)

Greg must expose and preserve the full relevant public capability surface of the selected AI SDK v7 release. This takes precedence over convenience, dependency minimization, and API tidiness.

- The scope is **discovered by research, not by this plan's examples**. Enumerate the real public surface of the selected `ai` version (text generation and streaming, structured output, tools and tool loops, agents/harness-related APIs, multimodal, image/speech/transcription, embeddings, reranking, middleware, provider management, telemetry, UI-message/stream helpers, types, errors, lifecycle callbacks, etc.) and decide explicitly what is in Greg's scope. Anything exposed by the SDK and not consciously excluded is preserved.
- Do not shrink request schemas, restrict result types, or flatten provider-specific configuration (`providerOptions`, provider metadata, headers, abort/timeouts, retries, etc.).
- Greg's only intended interface change is model input and the required `apiKey`/`baseUrl` fields. Everything else should behave as the native SDK does, including types.
- Do not rename native options or invent equivalents. Do not normalize provider differences without a concrete requirement.
- Greg may add genuinely useful extras, but only if they complement and never restrict the SDK. No speculative features.
- Provide an auditable way to show nothing was dropped (see §7).

## 4. Native Provider Integrations

- Use the **official `@ai-sdk/*` provider package** whenever an appropriate one exists (examples, not a list: `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/alibaba`, `@ai-sdk/xai`). Do not funnel everything through an OpenAI-compatible adapter, a gateway, or custom HTTP.
- Providers without an official package (for example OpenRouter, which is a community package, `@openrouter/ai-sdk-provider`) must be investigated individually: confirm it exists, confirm it targets the AI SDK v7 provider specification, and decide whether to use it or the OpenAI-compatible provider. Record the decision and the evidence.
- Provider packages should be built-in dependencies of Greg, so users do not install them separately. Check install size, peer-dependency ranges, and version-alignment implications (all provider packages must be compatible with the chosen `ai` v7 version).
- Do not claim a universal capability set. Provider-native features and limits must be accurately preserved.
- The supported provider list is a product decision to be settled by research and the repo owner; don't hardcode assumptions from this plan.

## 5. Verified Research Findings (as of 2026-10-21)

These came from official AI SDK documentation. Re-verify against the exact version you pin.

| Finding | Source |
|---|---|
| AI SDK 7.0 shipped; requires **Node.js ≥ 22** (tested 22/24/26); all packages are **ESM-only** (no `require`). Greg's `engines`, `type`, and build output must follow. | [Migration guide 6→7](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) |
| Third-party reports put the latest 7.0.x patch at 7.0.143; **unverified by me**. Confirm the actual current version from the npm registry and the repo lockfile before pinning. | secondary: developersdigest.tech write-up |
| A plain model string `creator/model-name` is **interpreted by the AI SDK as a Vercel AI Gateway model** (the default global provider). This overlaps syntactically with Greg's `provider/model_id`. Greg must not let its strings fall through to the Gateway unintentionally, and must be explicit about how it resolves the string before the SDK does. | [Choosing a provider](https://ai-sdk.dev/docs/getting-started/choosing-a-provider), [AI Gateway provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway) |
| The SDK's own provider registry uses `:` as the default provider/model separator, not `/`. Greg's `/` contract is therefore Greg-specific. | [Provider & model management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) |
| `@ai-sdk/openai-compatible` exposes `createOpenAICompatible({ name, baseURL, apiKey, ... })`. Note the **`baseURL`** spelling. | [OpenAI-compatible providers](https://ai-sdk.dev/providers/openai-compatible-providers) |
| OpenRouter is served by the community package `@openrouter/ai-sdk-provider` (`createOpenRouter({ apiKey, ... })`); its v7 compatibility is **not verified**. | [Community provider page](https://ai-sdk.dev/providers/community-providers/openrouter) |
| v7 renames/changes that affect a wrapper's types and docs: `system`→`instructions`, `stepCountIs`→`isStepCount`, `onFinish/onStepFinish`→`onEnd/onStepEnd`, `fullStream`→`stream`, `experimental_telemetry`→`telemetry`, `needsApproval`→`toolApproval`, new `reasoning` option, `include` options (request/response bodies excluded by default), `finalStep`, `runtimeContext`/`toolsContext`, new stateless stream helpers, OpenTelemetry moved to `@ai-sdk/otel`. Greg must track v7 names, not v6 memory. | [Migration guide 6→7](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) |
| Provider-specific v7 changes exist (e.g. `xai(modelId)` now defaults to the Responses API; Google provider renamed `GoogleGenerativeAI*` → `Google*`; OpenAI reasoning-summary default). Greg must not mask or change these defaults. | same guide |
| Provider tooling: official codemods (`npx @ai-sdk/codemod v7`) and a migration skill exist; useful for reference but not a Greg requirement. | same guide |

## 6. Open Questions the Coding Agent Must Resolve (research, then decide)

1. **Resolution architecture.** What is the least invasive way to accept a `provider/model_id` string plus `apiKey`/`baseUrl` while keeping every AI SDK function's native options and result types intact? Candidate directions include wrapping functions, using the SDK's provider/registry/custom-provider mechanisms, or a combination. Evaluate against §3; pick the one that loses nothing. Check how the SDK's string-model resolution works in v7 source and whether it can be overridden without conflicting with Greg's format.
2. **Type fidelity.** Can Greg's public types be derived from the SDK's own so that new SDK options appear automatically? Hand-copied option types will drift and violate §3.
3. **Where `apiKey`/`baseUrl` live.** Per request is mandated, but the shape (top-level fields vs a model-spec object) must be chosen without colliding with any native option name. Verify no collision in the v7 option set.
4. **Per-provider config mapping.** For each supported provider: which package, which factory, which settings names, what `baseUrl` means, whether a placeholder key works, and any provider-specific settings that must remain reachable (headers, custom fetch, organization/project IDs, etc.).
5. **Provider-instance handling.** Whether to cache instances keyed by provider+credentials+endpoint, and how to avoid leaking secrets in logs or caches.
6. **Official-vs-community coverage.** Produce a table of supported providers, package, source type (official/community), and v7 compatibility evidence.
7. **Dependency policy.** Bundled provider packages: dependency vs peer vs optional, version-range alignment with `ai`, and install footprint.
8. **Gateway interplay.** Decide whether Greg offers any way to reach the AI Gateway, and ensure Greg strings never accidentally route there.
9. **Any capability in the SDK's public surface that cannot be preserved** for a concrete reason: identify it, document the reason, and surface it to the owner rather than silently dropping it.

If a fact cannot be verified, say so in the code comments/docs and in the final report. Do not invent option names, schemas, or package behavior.

## 7. Validation and Success Criteria

Done means all of the following are demonstrably true:

- `provider/model_id` parsing follows the first-slash rule, including multi-slash model IDs (e.g. `openrouter/openrouter/free`) and malformed-input cases. Tests cover these.
- `compatible/<model>` reaches a custom OpenAI-compatible endpoint using the request's `apiKey` and `baseUrl` (test against a local mock server).
- `apiKey` and `baseUrl` are required for every provider in both types and runtime; omitting either fails clearly. No provider is exempt.
- Each supported provider uses its native official package where one exists; no blanket OpenAI-compatible or Gateway routing. A test or inspection shows which package serves which provider.
- Greg strings are never silently resolved by the SDK's default Gateway.
- Provider packages are available through Greg's install without separate user installation; the install works on a clean project on a supported Node version.
- **Feature-preservation audit:** a written inventory of the selected `ai` version's public exports/options, marked preserved / intentionally changed (with reason) / excluded (with reason). Prefer an automated check (for example type-level or export-surface comparison against the pinned `ai` version) so future SDK updates surface regressions.
- Native options, `providerOptions`, provider metadata, streaming, tools/tool loops, structured output, usage, errors, abort/cancellation, and lifecycle callbacks work through Greg as they do natively, verified at least against representative providers and a mock provider.
- Types: results and options are the SDK's own types (or derived from them), not reduced look-alikes.
- ESM-only output, Node ≥ 22, consistent with v7.
- Implementation is checked against the pinned v7 version's docs/types/source. Nothing relies on remembered v5/v6 APIs.
- Final report from the implementer lists: pinned versions, provider table with evidence, decisions made for §6, anything unverified, and any preservation exceptions.

## 8. Scope Guardrails

- Do not rebuild provider protocols or HTTP clients.
- Do not add speculative abstractions, aliases, or features.
- Inspect the repository first (existing code, `package.json`, lockfile, conventions) and let it constrain choices; this plan was written without it, so where the repo disagrees with an assumption here, the repo wins and the discrepancy should be reported.
- Prefer clear, predictable behavior over cleverness.

## 9. Research Honesty Note

Research for this plan covered: the official v6→v7 migration guide, the provider-selection and provider-management docs, the AI Gateway page, the OpenAI-compatible provider docs, and the OpenRouter community provider page. It did **not** include: inspecting the Greg repository, reading v7 type definitions or source, confirming the exact latest published versions on npm, enumerating the full v7 public export list, or verifying v7 compatibility of community providers. Those are explicit first tasks for the implementer.
