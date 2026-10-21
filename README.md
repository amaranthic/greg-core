# @amaranthic/greg-sdk

A unified model runtime built on top of [Vercel AI SDK v7](https://ai-sdk.dev).

## Overview

Greg SDK is a runtime layer on top of Vercel AI SDK v7 (`ai`). It manages model resolution (`provider/model_id`), mandatory per-request credentials (`baseUrl`, `apiKey`), and provider lifecycle dynamically, while preserving 100% of the underlying AI SDK's capabilities, options, result types, tools, and streaming mechanics.

## Key Principles

- **Runtime Layer**: Resolves and provisions native model instances at runtime based on incoming credentials and endpoint definitions.
- **Unified Model Resolution**: Select models via `provider/model_id` (split strictly on the first slash) or `compatible/model_name` for custom OpenAI-compatible endpoints.
- **Mandatory Configuration**: Explicit `baseUrl` and `apiKey` per request, eliminating hidden environment dependencies while adapting seamlessly to provider-specific factories.
- **Zero Capability Loss**: Preserves the complete AI SDK v7 surface—`generateText`, `streamText`, `generateObject`, `ToolLoopAgent`, multi-step executions, telemetry, and middleware without schema truncation or type degradation.

## Requirements

- Node.js ≥ 22 / Bun ≥ 1.0
- ESM-only

## License

MIT
