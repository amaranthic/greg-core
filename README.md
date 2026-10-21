# @amaranthic/greg-sdk

> **The unified agent runtime powering Greg harnesses, built on Vercel AI SDK.**

Greg SDK is the foundational runtime layer powering the Greg agent ecosystem—including **Greg Code**, **Greg Actions**, **Greg ACP**, and custom coding harnesses. Built directly on top of [Vercel AI SDK v7](https://ai-sdk.dev), it provides single-string model resolution, mandatory per-request credentials, and zero-compromise SDK capability preservation. Open source, modular, and built for production agent harnesses.

Pick any model with a simple `provider/model_id` string, supply explicit endpoint credentials, and access 100% of the underlying Vercel AI SDK surface—with zero runtime lock-in, zero schema truncation, and zero capability loss.

---

## Why Greg SDK?

- **Unified Single-String Model Selection**: Reference any model using `provider/model_id` (e.g. `openai/gpt-4o`, `anthropic/claude-3-7-sonnet`, `google/gemini-2.5-flash-lite`).
- **First-Slash Parsing Rule**: Splits strictly on the first slash; multi-slash identifiers such as `openrouter/openrouter/free` or `compatible/org/model` are preserved without truncation.
- **Custom Endpoints**: Route to any self-hosted or proxy endpoint via `compatible/model_name`.
- **Mandatory Explicit Credentials**: Requires `apiKey` and `baseUrl` on every request. Eliminates hidden environment assumptions and ensures thread-safe, multi-tenant isolation with zero race conditions.
- **100% AI SDK Feature Preservation**: Re-exports the complete native `ai` package. All classes (`ToolLoopAgent`, `AISDKError`), stateless streaming helpers (`toUIMessageStream`, `createTextStreamResponse`), lifecycle hooks, and options (`providerOptions`, `toolApproval`, `telemetry`) are directly accessible.
- **Pre-bundled Official Providers**: Includes official `@ai-sdk/*` provider packages out of the box.

---

## Installation

```bash
npm install @amaranthic/greg-sdk
# or
bun add @amaranthic/greg-sdk
```

> **Requirements:** Node.js &ge; 22.0.0 or Bun &ge; 1.0. ESM only.

---

## Quickstart

### 1. Text Generation (`generateText`)

```typescript
import { generateText } from "@amaranthic/greg-sdk";

const result = await generateText({
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  prompt: "What is quantum computing in one sentence?",
});

console.log(result.text);
console.log(result.usage);
```

### 2. Real-Time Token Streaming (`streamText`)

```typescript
import { streamText } from "@amaranthic/greg-sdk";

const result = streamText({
  model: "anthropic/claude-3-7-sonnet-20250219",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  prompt: "Write a short haiku about compilers.",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### 3. Structured Output (`generateObject`)

```typescript
import { generateObject } from "@amaranthic/greg-sdk";
import { z } from "zod";

const result = await generateObject({
  model: "google/gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    confidence: z.number(),
  }),
  prompt: "Categorize an article about WebAssembly performance.",
});

console.log(result.object);
```

### 4. Multi-Step Tool Calling & Agents

Greg fully supports tool execution loops using AI SDK v7's `tool` and `isStepCount`:

```typescript
import { streamText, tool, isStepCount } from "@amaranthic/greg-sdk";
import { z } from "zod";

const weatherTool = tool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({
    city: z.string().describe("Target city name"),
  }),
  execute: async ({ city }) => ({
    city,
    temperatureCelsius: 22,
    condition: "Sunny",
  }),
});

const result = streamText({
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  tools: { weather: weatherTool },
  stopWhen: isStepCount(5), // Enables multi-step tool call loop
  prompt: "What is the weather in Tokyo right now?",
});

for await (const part of result.stream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.text);
  } else if (part.type === "tool-call") {
    console.log(`\n[Executing: ${part.toolName}]`);
  }
}
```

---

## Supported Providers

Greg comes with built-in official adapters for all major model ecosystems:

| Provider Identifier | Native Package | Default Endpoint / Behavior | Example Model ID |
|---|---|---|---|
| `openai` | `@ai-sdk/openai` | `https://api.openai.com/v1` (Responses API) | `openai/gpt-4o` |
| `anthropic` | `@ai-sdk/anthropic` | `https://api.anthropic.com/v1` | `anthropic/claude-3-7-sonnet` |
| `google` | `@ai-sdk/google` | `https://generativelanguage.googleapis.com/v1beta` | `google/gemini-2.5-flash-lite` |
| `xai` | `@ai-sdk/xai` | `https://api.x.ai/v1` (Responses API) | `xai/grok-2-1212` |
| `deepseek` | `@ai-sdk/deepseek` | `https://api.deepseek.com` | `deepseek/deepseek-chat` |
| `groq` | `@ai-sdk/groq` | `https://api.groq.com/openai/v1` | `groq/llama-3.3-70b-versatile` |
| `mistral` | `@ai-sdk/mistral` | `https://api.mistral.ai/v1` | `mistral/mistral-large-latest` |
| `cohere` | `@ai-sdk/cohere` | `https://api.cohere.com/v2` | `cohere/command-r-plus` |
| `togetherai` | `@ai-sdk/togetherai` | `https://api.together.xyz/v1` | `togetherai/meta-llama/Llama-3-70b-chat-hf` |
| `alibaba` | `@ai-sdk/alibaba` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `alibaba/qwen-max` |
| `openrouter` | `@ai-sdk/openai-compatible` | `https://openrouter.ai/api/v1` | `openrouter/openrouter/free` |
| `compatible` | `@ai-sdk/openai-compatible` | Any custom OpenAI-compatible endpoint | `compatible/meta-llama/llama-3-8b` |

---

## Provider-Specific Options (`providerOptions`)

Because Greg preserves native AI SDK options without filtering, you can pass provider-specific settings directly via `providerOptions`:

```typescript
const result = await generateText({
  model: "google/gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  prompt: "Synthesize this data",
  providerOptions: {
    google: {
      thinkingConfig: { thinkingBudget: 2048 },
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" }
      ],
    },
    openai: {
      reasoningEffort: "medium",
    },
    anthropic: {
      cacheControl: { type: "ephemeral" },
    },
  },
});
```

---

## Error Handling

Greg provides actionable, canonical error classes extending AI SDK's `AISDKError`:

```typescript
import {
  generateText,
  InvalidModelStringError,
  MissingCredentialsError,
  UnsupportedProviderError,
} from "@amaranthic/greg-sdk";

try {
  await generateText({
    model: "openai/gpt-4o",
    apiKey: "", // Error: missing apiKey
    baseUrl: "https://api.openai.com/v1",
    prompt: "Hello",
  });
} catch (error) {
  if (MissingCredentialsError.isInstance(error)) {
    console.error(`Missing field: ${error.missingField} for ${error.provider}`);
  } else if (InvalidModelStringError.isInstance(error)) {
    console.error(`Malformed string: ${error.modelString}`);
  } else if (UnsupportedProviderError.isInstance(error)) {
    console.error(`Unknown provider: ${error.provider}`);
    console.error(`Supported: ${error.supportedProviders.join(", ")}`);
  }
}
```

---

## Verification & Architecture

- **Zero Gateway Fallthrough**: Explicit model parsing guarantees requests never fall through to default Vercel AI Gateway assumptions.
- **Multi-Tenant Safety**: Provider instances are constructed statelessly per call with local variables. No credentials persist in shared state.
- **Pass-through LanguageModel Support**: Pre-instantiated `LanguageModel` instances pass straight through without re-resolution.
- **Automated Parity Audit**: Tested continuously against the pinned `ai` release to verify that 100% of public exports, classes, types, and helpers remain intact.

---

## License

[MIT](LICENSE) © [Amaranthic](https://github.com/amaranthic)
