# Contributing to @amaranthic/greg-sdk

Thank you for your interest in contributing to **Greg SDK**!

Greg SDK is the unified agent runtime powering the Greg agent ecosystem—including **Greg Code**, **Greg Actions**, **Greg ACP**, and custom coding harnesses. Built on top of [Vercel AI SDK v7](https://ai-sdk.dev), Greg provides dynamic single-string model resolution, mandatory per-request credentials, and zero-compromise SDK capability preservation.

To maintain the highest level of code quality, security, and developer ergonomics, all contributors and AI agents must strictly follow the engineering guardrails and architecture contracts documented below.

---

## 🏛️ Core Architectural Invariants

Every contribution must preserve Greg SDK's fundamental design principles:

1. **The First-Slash Rule**:
   - Model strings are parsed by splitting strictly on the **first `/` only**.
   - The segment before the first slash is the `provider` identifier (e.g. `openai`, `anthropic`, `google`, `openrouter`, `vercelgateway`, `compatible`).
   - All segments after the first slash form the `modelId` (e.g. `openrouter/openrouter/free`, `vercelgateway/openai/gpt-4o`, `compatible/org/model`) and must be preserved completely intact without secondary splitting.

2. **Mandatory Explicit Credentials**:
   - Every execution request **requires** non-empty `apiKey: string` and `baseUrl: string` values.
   - No provider is exempt. Never introduce silent fallbacks to ambient `process.env` singletons in runtime calls.
   - Base URLs must be adapted to provider-specific requirements (e.g. `baseURL` vs `baseUrl`) inside dedicated provider adapters.

3. **Zero Capability Loss (100% Feature Preservation)**:
   - Greg SDK must never filter, truncate, or restrict native Vercel AI SDK capabilities.
   - All native exports (`tool`, `isStepCount`, `ToolLoopAgent`, `AISDKError`, stream utilities, middleware) must be re-exported directly.
   - All options (`providerOptions`, `onFinish`, `onChunk`, `onStepFinish`, `abortSignal`, `headers`, `telemetry`) must forward cleanly to native execution functions.

4. **Scope Boundaries**:
   - Greg SDK is strictly a **Language & Agent Model Runtime** (text generation, live streaming, multi-step tool execution, structured outputs, embeddings).
   - **No Image Generation (`generateImage`)**: Image synthesis (DALL-E, Imagen) and media generation (audio/video) are explicitly out of scope.

5. **Stateless Multi-Tenant Isolation**:
   - Provider instances must be instantiated statelessly within the call frame. Never cache credentials in shared or module-level global variables.

---

## 📐 Strict Coding & Style Standards

### 1. Strict Identifier Casing
- **`camelCase`**: Strictly required for all variables, properties, functions, methods, and file names (except for types/classes).
- **`PascalCase`**: Strictly required for all classes, types, interfaces, and enums.
- **No Other Casing Allowed**: `snake_case` is strictly forbidden in code identifiers across the entire codebase.

### 2. Comprehensive JSDoc Documentation
- Every module, exported function, class, interface, type alias, parameter, and return value **must** be documented with rich JSDoc comments (`/** ... */`).
- Comments must provide clear developer-facing context, detailed `@param` descriptions, `@returns` explanations, `@throws` documentation, and practical `@example` blocks where beneficial.
- Preserve existing comments and docstrings when editing existing files.

### 3. Verification Over Assumptions
- Never assume library APIs, package signatures, or options from outdated training data.
- Always inspect installed package type declarations (`.d.ts`) directly inside `node_modules/` before integrating or modifying provider adapters.

---

## 🧪 Test Suite Architecture

To maintain high velocity, clean maintenance, and deep test coverage, Greg SDK enforces a disciplined test architecture:

- **Strict File Limit**: Restrict the entire test suite to a **maximum of 6 to 8 high-quality, high-coverage test files** located strictly within the `tests/` directory.
- **No Fragmented Test Files**: Do not create one-off, random, or micro-test files. Group related unit and integration tests into the existing canonical suites:
  1. [`tests/modelParsing.test.ts`](file:///home/nolan/works/greg-sdk/tests/modelParsing.test.ts) — First-slash parsing, whitespace trimming, and malformed string errors.
  2. [`tests/credentialsValidation.test.ts`](file:///home/nolan/works/greg-sdk/tests/credentialsValidation.test.ts) — Mandatory `apiKey` and `baseUrl` enforcement across all providers.
  3. [`tests/providerResolution.test.ts`](file:///home/nolan/works/greg-sdk/tests/providerResolution.test.ts) — Provider registry lookups, official adapter instantiation, and Gateway prevention.
  4. [`tests/compatibleProvider.test.ts`](file:///home/nolan/works/greg-sdk/tests/compatibleProvider.test.ts) — OpenAI-compatible routing and mock server verification.
  5. [`tests/runtimeExecution.test.ts`](file:///home/nolan/works/greg-sdk/tests/runtimeExecution.test.ts) — `generateText`, `streamText`, `generateObject`, and option passthrough.
  6. [`tests/featurePreservation.test.ts`](file:///home/nolan/works/greg-sdk/tests/featurePreservation.test.ts) — Automated parity audit asserting 100% export preservation from pinned `ai`.
- **Test Runner**: All tests must execute natively and pass 100% under Bun:
  ```bash
  bun test
  ```

---

## 🛠️ Local Development Workflow

### Prerequisites
- [Bun](https://bun.sh) &ge; 1.0 (primary runtime and test runner)
- [Node.js](https://nodejs.org) &ge; 22.0.0 (engine target)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/amaranthic/greg-sdk.git
cd greg-sdk
```

### 2. Install Dependencies
```bash
bun install --frozen-lockfile || bun install
```

### 3. Run Typecheck
Verify strict TypeScript compilation with zero errors:
```bash
bun run typecheck
```

### 4. Run the Test Suite
Execute all test suites with assertions:
```bash
bun test
```

### 5. Build the Project
Compile TypeScript into the distribution bundle (`dist/`):
```bash
bun run build
```

---

## 📁 Repository Structure

```text
greg-sdk/
├── src/
│   ├── errors.ts             # Canonical runtime errors extending AISDKError
│   ├── index.ts              # Public API entrypoint and native ai re-exports
│   ├── modelResolver.ts      # First-slash parsing & credential validation
│   ├── providerRegistry.ts   # Central provider lookup & registration
│   ├── runtime.ts            # Core runtime execution (generateText, streamText, etc.)
│   ├── types.ts              # Derived TypeScript interfaces and options
│   └── providers/            # Dedicated, modular provider adapters
│       ├── alibaba.ts
│       ├── anthropic.ts
│       ├── base.ts           # ProviderAdapter contract interface
│       ├── cohere.ts
│       ├── compatible.ts     # OpenAI-compatible / local LLM adapter
│       ├── deepseek.ts
│       ├── google.ts
│       ├── groq.ts
│       ├── mistral.ts
│       ├── openai.ts         # OpenAI adapter utilizing Responses API
│       ├── openrouter.ts
│       ├── togetherai.ts
│       ├── vercelGateway.ts  # Vercel AI Gateway adapter
│       └── xai.ts
├── tests/                    # Exactly 6 to 8 high-coverage test suites
├── examples/                 # Interactive usage examples
├── .github/workflows/        # CI/CD and automated release workflows
└── package.json
```

---

## 🚀 Adding a New Provider Adapter

If you are adding a new official provider adapter:

1. **Verify Official Package**: Ensure the provider has an official `@ai-sdk/<provider>` package available.
2. **Create Provider Module**: Create `src/providers/<providerName>.ts` implementing the `ProviderAdapter` interface from `src/providers/base.ts`.
3. **Enforce Casing & JSDoc**: Use strict `camelCase` for variables/functions and `PascalCase` for classes/types. Include rich JSDoc documentation with usage examples.
4. **Register Adapter**: Import and register the adapter in `src/providerRegistry.ts`. Do not export the adapter directly from `src/index.ts`.
5. **Update Tests**: Add test coverage into `tests/providerResolution.test.ts` verifying provider registry containment and model resolution.
6. **Update Documentation**: Add the provider to the supported providers table in [`README.md`](README.md).

---

## 📝 Commit & Pull Request Guidelines

### Commit Message Convention
We adhere to [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature or provider adapter
- `fix:` A bug fix or error correction
- `docs:` Documentation improvements or README changes
- `test:` Adding or refining test suites
- `chore:` Dependency updates, build configurations, or CI changes
- `refactor:` Code refactoring without behavioral changes

### Pull Request Checklist
Before submitting a pull request, ensure:

- [ ] `bun run typecheck` passes with zero type errors.
- [ ] `bun test` passes 100% of tests with zero failures.
- [ ] `bun run build` cleanly outputs to `dist/`.
- [ ] Strict casing rules are respected (`camelCase` and `PascalCase` only).
- [ ] Rich JSDoc comments are present on all new exported symbols.
- [ ] Total test files in `tests/` remain within the 6 to 8 file limit.
- [ ] No extraneous files, console logs, or debug code are committed.

---

## 📜 License

By contributing to Greg SDK, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
